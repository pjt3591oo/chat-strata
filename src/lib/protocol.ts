/**
 * Wire protocol shared by the chat server (server.js + src/lib/chat-store.ts)
 * and the browser client (src/hooks/useChat.ts).
 *
 * Transport: JSON text frames over a WebSocket at `ws://<host>/ws`.
 * Every frame is a discriminated union on `type`.
 */

export type ChatMessage = {
  id: string;
  room: string;
  nickname: string;
  text: string;
  /** epoch milliseconds */
  ts: number;
};

/** Client -> Server frames. */
export type ClientFrame =
  | { type: "join"; room: string; nickname: string }
  | { type: "message"; text: string }
  | { type: "leave" };

/** Server -> Client frames. */
export type ServerFrame =
  /** Ack sent to the joining client only: current roster + recent history. */
  | { type: "joined"; room: string; nickname: string; members: string[]; history: ChatMessage[] }
  /** A new chat message broadcast to every member of the room. */
  | { type: "message"; message: ChatMessage }
  /** Roster broadcast after someone joins or leaves. */
  | { type: "members"; members: string[] }
  /** Human-readable join/leave/etc. notice broadcast to the room. */
  | { type: "system"; text: string }
  /** Recoverable protocol/validation error sent to the offending client only. */
  | { type: "error"; message: string };

export const LIMITS = {
  nicknameMin: 1,
  nicknameMax: 24,
  roomMin: 1,
  roomMax: 32,
  textMax: 1000,
  /** Max messages kept per room in memory. */
  historySize: 200,
} as const;
