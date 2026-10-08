"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/protocol";
import type { ChatMessage, ClientFrame, ServerFrame } from "@/lib/protocol";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type SystemEvent = { id: string; text: string; ts: number };

export type UseChatOptions = { room: string; nickname: string };

export type UseChatResult = {
  status: ConnectionStatus;
  messages: ChatMessage[];
  members: string[];
  systemEvents: SystemEvent[];
  /** Last server `error` frame message, or null. */
  error: string | null;
  /** True once a `joined` ack arrived; false means the join never succeeded. */
  hasJoined: boolean;
  /** Send a chat message. Returns false when offline or text is invalid. */
  send: (text: string) => boolean;
  /** Intentionally close the socket (no reconnect). */
  disconnect: () => void;
};

const MAX_CLIENT_MESSAGES = 500;
const MAX_SYSTEM_EVENTS = 100;
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.room === "string" &&
    typeof value.nickname === "string" &&
    typeof value.text === "string" &&
    typeof value.ts === "number"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Defensive parse: malformed or unknown frames are dropped, never crash the client. */
function parseServerFrame(raw: unknown): ServerFrame | null {
  if (typeof raw !== "string") return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  switch (data.type) {
    case "joined":
      if (
        typeof data.room !== "string" ||
        typeof data.nickname !== "string" ||
        !isStringArray(data.members) ||
        !Array.isArray(data.history) ||
        !data.history.every(isChatMessage)
      ) {
        return null;
      }
      return {
        type: "joined",
        room: data.room,
        nickname: data.nickname,
        members: data.members,
        history: data.history,
      };
    case "message":
      if (!isChatMessage(data.message)) return null;
      return { type: "message", message: data.message };
    case "members":
      if (!isStringArray(data.members)) return null;
      return { type: "members", members: data.members };
    case "system":
      if (typeof data.text !== "string") return null;
      return { type: "system", text: data.text };
    case "error":
      if (typeof data.message !== "string") return null;
      return { type: "error", message: data.message };
    default:
      return null;
  }
}

function appendMessage(prev: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (prev.some((item) => item.id === message.id)) return prev;
  const next = [...prev, message];
  return next.length > MAX_CLIENT_MESSAGES
    ? next.slice(next.length - MAX_CLIENT_MESSAGES)
    : next;
}

export function useChat({ room, nickname }: UseChatOptions): UseChatResult {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const fatalRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const systemSeqRef = useRef(0);

  const closeSocket = useCallback((): void => {
    stoppedRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const ws = wsRef.current;
    wsRef.current = null;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      const frame: ClientFrame = { type: "leave" };
      try {
        ws.send(JSON.stringify(frame));
      } catch {
        // socket dying mid-send; close() below still tears it down
      }
    }
    ws.onclose = null; // teardown must not schedule a reconnect
    ws.close();
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    fatalRef.current = false;
    hasJoinedRef.current = false;
    attemptRef.current = 0;

    const connect = (): void => {
      timerRef.current = null;
      if (stoppedRef.current) return;

      const scheme = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${scheme}://${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("connected");
        const frame: ClientFrame = { type: "join", room, nickname };
        ws.send(JSON.stringify(frame));
      };

      ws.onmessage = (event: MessageEvent) => {
        const frame = parseServerFrame(event.data);
        if (!frame) return;

        switch (frame.type) {
          case "joined":
            hasJoinedRef.current = true;
            fatalRef.current = false;
            setMessages(frame.history.slice(-MAX_CLIENT_MESSAGES));
            setMembers(frame.members);
            setHasJoined(true);
            setError(null);
            setStatus("connected");
            break;
          case "message":
            setMessages((prev) => appendMessage(prev, frame.message));
            break;
          case "members":
            setMembers(frame.members);
            break;
          case "system": {
            systemSeqRef.current += 1;
            const event: SystemEvent = {
              id: `sys-${Date.now()}-${systemSeqRef.current}`,
              text: frame.text,
              ts: Date.now(),
            };
            setSystemEvents((prev) => [...prev, event].slice(-MAX_SYSTEM_EVENTS));
            break;
          }
          case "error":
            setError(frame.message);
            // A rejected join (e.g. duplicate nickname) is an expected close:
            // surface it to the UI instead of hammering the server with retries.
            if (!hasJoinedRef.current) fatalRef.current = true;
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (stoppedRef.current || fatalRef.current) {
          setStatus("disconnected");
          return;
        }
        setStatus("reconnecting");
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** attemptRef.current, BACKOFF_CAP_MS);
        attemptRef.current += 1;
        timerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose always fires after onerror; backoff is handled there.
      };
    };

    connect();

    return () => {
      closeSocket();
    };
  }, [room, nickname, closeSocket]);

  const send = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (trimmed.length < 1 || trimmed.length > LIMITS.textMax) return false;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      const frame: ClientFrame = { type: "message", text: trimmed };
      ws.send(JSON.stringify(frame));
      return true;
    },
    [],
  );

  const disconnect = useCallback((): void => {
    closeSocket();
    setStatus("disconnected");
  }, [closeSocket]);

  return { status, messages, members, systemEvents, error, hasJoined, send, disconnect };
}
