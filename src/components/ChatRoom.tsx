"use client";

import { useEffect, useState } from "react";
import { useChat } from "@/hooks/useChat";
import type { ConnectionStatus } from "@/hooks/useChat";
import MessageList from "@/components/MessageList";
import MemberList from "@/components/MemberList";
import Composer from "@/components/Composer";

type ChatRoomProps = {
  room: string;
  nickname: string;
  /** Leave the room. An error message bounces the user back to the join form with it shown inline. */
  onExit: (errorMessage?: string) => void;
};

const STATUS_META: Record<ConnectionStatus, { dot: string; label: string; pulse: boolean }> = {
  connecting: { dot: "bg-amber-500", label: "연결 중", pulse: true },
  connected: { dot: "bg-emerald-500", label: "연결됨", pulse: false },
  reconnecting: { dot: "bg-amber-500", label: "재연결 중", pulse: true },
  disconnected: { dot: "bg-red-500", label: "연결 끊김", pulse: false },
};

export default function ChatRoom({ room, nickname, onExit }: ChatRoomProps) {
  const { status, messages, members, systemEvents, error, hasJoined, send } = useChat({
    room,
    nickname,
  });
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  // Join rejected (e.g. duplicate nickname): hand control back to the join form.
  useEffect(() => {
    if (error && !hasJoined) onExit(error);
  }, [error, hasJoined, onExit]);

  const offline = status !== "connected";
  const visibleError = error !== null && hasJoined && error !== dismissedError ? error : null;
  const statusMeta = STATUS_META[status];

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white px-4 dark:border-white/10 dark:bg-zinc-900">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          {room}
        </h1>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
          <span
            aria-hidden="true"
            className={
              "h-1.5 w-1.5 rounded-full " +
              statusMeta.dot +
              " " +
              (statusMeta.pulse ? "animate-pulse motion-reduce:animate-none" : "")
            }
          />
          {statusMeta.label}
        </span>
        <span className="shrink-0 font-mono text-[12px] tabular-nums text-zinc-500 md:hidden dark:text-zinc-400">
          {members.length}명
        </span>
        <button
          type="button"
          onClick={() => onExit()}
          className="ml-auto shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-50"
        >
          나가기
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {status === "reconnecting" && (
            <div
              role="status"
              aria-live="polite"
              className="shrink-0 bg-amber-50 px-4 py-2 text-[13px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            >
              연결이 끊어졌어요. 자동으로 다시 연결하고 있어요.
            </div>
          )}
          {status === "disconnected" && !visibleError && (
            <div
              role="status"
              aria-live="polite"
              className="shrink-0 bg-red-50 px-4 py-2 text-[13px] text-red-600 dark:bg-red-500/10 dark:text-red-400"
            >
              서버에 연결할 수 없어요.
            </div>
          )}
          {visibleError && (
            <div
              role="alert"
              className="flex shrink-0 items-center justify-between gap-3 bg-red-50 px-4 py-2 text-[13px] text-red-600 dark:bg-red-500/10 dark:text-red-400"
            >
              <span>{visibleError}</span>
              <button
                type="button"
                aria-label="오류 닫기"
                onClick={() => setDismissedError(visibleError)}
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          )}
          <MessageList messages={messages} systemEvents={systemEvents} myNickname={nickname} />
          <Composer disabled={offline} onSend={send} />
        </main>
        <MemberList members={members} myNickname={nickname} />
      </div>
    </div>
  );
}
