/**
 * In-memory chat store shared by the custom server (server.js) and the
 * /api/rooms route handler.
 *
 * The store lives on `globalThis` so every module instance in the process —
 * the one Node type-strips for server.js and the one Turbopack compiles for
 * route handlers — reads and writes the SAME rooms. It also survives Next dev
 * hot-reloads.
 */

// Explicit .ts extensions: Node's native type-stripping (used when server.js
// requires this module) resolves ESM imports literally, no extension guessing.
import { LIMITS } from "./protocol.ts";
import type { ChatMessage } from "./protocol.ts";

type Room = {
  readonly members: Set<string>;
  readonly history: ChatMessage[];
};

type ChatStore = {
  readonly rooms: Map<string, Room>;
};

export type JoinResult =
  | { ok: true; members: string[]; history: ChatMessage[] }
  | { ok: false; error: string };

export type RoomSummary = { name: string; memberCount: number };

const STORE_KEY = "__atrataChatStore";

function getStore(): ChatStore {
  const g = globalThis as Record<string, unknown>;
  const existing = g[STORE_KEY] as ChatStore | undefined;
  if (existing !== undefined) return existing;
  const created: ChatStore = { rooms: new Map() };
  g[STORE_KEY] = created;
  return created;
}

/** Returns an error message, or null when the value satisfies LIMITS. */
export function validateRoom(room: unknown): string | null {
  if (typeof room !== "string") return "room must be a string";
  if (room.length < LIMITS.roomMin) return `room must be at least ${LIMITS.roomMin} character(s)`;
  if (room.length > LIMITS.roomMax) return `room must be at most ${LIMITS.roomMax} characters`;
  return null;
}

/** Returns an error message, or null when the value satisfies LIMITS. */
export function validateNickname(nickname: unknown): string | null {
  if (typeof nickname !== "string") return "nickname must be a string";
  if (nickname.length < LIMITS.nicknameMin)
    return `nickname must be at least ${LIMITS.nicknameMin} character(s)`;
  if (nickname.length > LIMITS.nicknameMax)
    return `nickname must be at most ${LIMITS.nicknameMax} characters`;
  return null;
}

/** Returns an error message, or null when the value satisfies LIMITS. */
export function validateText(text: unknown): string | null {
  if (typeof text !== "string") return "text must be a string";
  if (text.length > LIMITS.textMax) return `text must be at most ${LIMITS.textMax} characters`;
  return null;
}

/** Auto-creates the room; rejects duplicate nicknames. */
export function joinRoom(room: string, nickname: string): JoinResult {
  const store = getStore();
  let entry = store.rooms.get(room);
  if (entry === undefined) {
    entry = { members: new Set(), history: [] };
    store.rooms.set(room, entry);
  }
  if (entry.members.has(nickname)) {
    return { ok: false, error: `nickname "${nickname}" is already taken in room "${room}"` };
  }
  entry.members.add(nickname);
  return { ok: true, members: [...entry.members], history: [...entry.history] };
}

/** Returns the remaining roster, or null when the nickname was not in the room. */
export function leaveRoom(room: string, nickname: string): string[] | null {
  const store = getStore();
  const entry = store.rooms.get(room);
  if (entry === undefined || !entry.members.delete(nickname)) return null;
  const members = [...entry.members];
  if (members.length === 0) store.rooms.delete(room);
  return members;
}

/** Appends a message to the room history (capped at LIMITS.historySize). */
export function postMessage(room: string, nickname: string, text: string): ChatMessage | null {
  const entry = getStore().rooms.get(room);
  if (entry === undefined) return null;
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    room,
    nickname,
    text,
    ts: Date.now(),
  };
  entry.history.push(message);
  if (entry.history.length > LIMITS.historySize) {
    entry.history.splice(0, entry.history.length - LIMITS.historySize);
  }
  return message;
}

export function listRooms(): RoomSummary[] {
  const summaries: RoomSummary[] = [];
  for (const [name, entry] of getStore().rooms) {
    summaries.push({ name, memberCount: entry.members.size });
  }
  summaries.sort((a, b) => a.name.localeCompare(b.name));
  return summaries;
}
