"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LIMITS } from "@/lib/protocol";

type RoomInfo = { name: string; memberCount: number };

type JoinFormProps = {
  initialNickname: string;
  initialRoom: string;
  /** Server error from a failed join attempt (e.g. duplicate nickname). */
  serverError: string | null;
  onJoin: (room: string, nickname: string) => void;
};

type FieldErrors = { nickname?: string; room?: string };

function isRoomInfo(value: unknown): value is RoomInfo {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.memberCount === "number";
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200/70 bg-white px-3 text-[15px] text-zinc-900 " +
  "placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 " +
  "dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export default function JoinForm({ initialNickname, initialRoom, serverError, onJoin }: JoinFormProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [room, setRoom] = useState(initialRoom);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomsState, setRoomsState] = useState<"loading" | "ready" | "failed">("loading");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (!res.ok) throw new Error(`rooms request failed: ${res.status}`);
        const data: unknown = await res.json();
        const raw = (data as { rooms?: unknown } | null)?.rooms;
        const list = Array.isArray(raw) ? raw.filter(isRoomInfo) : [];
        list.sort(
          (a, b) =>
            b.memberCount - a.memberCount || a.name.localeCompare(b.name, "ko"),
        );
        if (!cancelled) {
          setRooms(list);
          setRoomsState("ready");
        }
      } catch {
        if (!cancelled) setRoomsState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    const trimmedRoom = room.trim();

    const next: FieldErrors = {};
    if (trimmedNickname.length < LIMITS.nicknameMin || trimmedNickname.length > LIMITS.nicknameMax) {
      next.nickname = `닉네임은 ${LIMITS.nicknameMin}~${LIMITS.nicknameMax}자로 입력해 주세요.`;
    }
    if (trimmedRoom.length < LIMITS.roomMin || trimmedRoom.length > LIMITS.roomMax) {
      next.room = `방 이름은 ${LIMITS.roomMin}~${LIMITS.roomMax}자로 입력해 주세요.`;
    }
    setFieldErrors(next);
    if (Object.keys(next).length === 0) {
      onJoin(trimmedRoom, trimmedNickname);
    }
  };

  const selectedRoom = room.trim();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          그룹 채팅 참여
        </h1>
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          닉네임과 방만 고르면 바로 대화에 참여할 수 있어요.
        </p>

        {serverError && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] leading-5 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="nickname"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              닉네임
            </label>
            <input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={LIMITS.nicknameMax}
              placeholder="예: 나그네"
              autoComplete="nickname"
              className={inputClass}
              aria-invalid={fieldErrors.nickname !== undefined}
            />
            {fieldErrors.nickname && (
              <p role="alert" className="mt-1.5 text-[13px] text-red-500 dark:text-red-400">
                {fieldErrors.nickname}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="room"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              방
            </label>
            <input
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={LIMITS.roomMax}
              placeholder="새 방 이름을 입력하거나 아래에서 선택하세요"
              className={inputClass}
              aria-invalid={fieldErrors.room !== undefined}
            />
            {fieldErrors.room && (
              <p role="alert" className="mt-1.5 text-[13px] text-red-500 dark:text-red-400">
                {fieldErrors.room}
              </p>
            )}

            <div className="mt-3">
              <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                기존 방
              </span>
              {roomsState === "loading" && (
                <p className="mt-1.5 text-[13px] text-zinc-400 dark:text-zinc-500">
                  방 목록을 불러오는 중…
                </p>
              )}
              {roomsState === "failed" && (
                <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                  방 목록을 불러오지 못했어요. 방 이름을 직접 입력해 주세요.
                </p>
              )}
              {roomsState === "ready" && rooms.length === 0 && (
                <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                  아직 만들어진 방이 없어요. 새 방 이름을 입력해 시작하세요.
                </p>
              )}
              {roomsState === "ready" && rooms.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {rooms.map((r) => {
                    const selected = selectedRoom === r.name;
                    return (
                      <button
                        key={r.name}
                        type="button"
                        onClick={() => {
                          setRoom(r.name);
                          setFieldErrors((prev) => ({ ...prev, room: undefined }));
                        }}
                        aria-pressed={selected}
                        className={
                          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors " +
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 " +
                          (selected
                            ? "bg-indigo-600 font-medium text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15")
                        }
                      >
                        {selected && (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3.5 8.5l3 3 6-6.5" />
                          </svg>
                        )}
                        <span className="max-w-40 truncate">{r.name}</span>
                        <span
                          className={
                            "font-mono text-[11px] tabular-nums " +
                            (selected ? "text-white/80" : "text-zinc-400 dark:text-zinc-500")
                          }
                        >
                          {r.memberCount}명
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="mt-1 h-10 rounded-lg bg-indigo-600 text-[15px] font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
          >
            입장하기
          </button>
        </form>
      </main>
    </div>
  );
}
