"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "@/lib/protocol";
import type { SystemEvent } from "@/hooks/useChat";
import "./chat.css";

type MessageListProps = {
  messages: ChatMessage[];
  systemEvents: SystemEvent[];
  myNickname: string;
};

type TimelineEntry =
  | { kind: "message"; key: string; ts: number; data: ChatMessage }
  | { kind: "system"; key: string; ts: number; data: SystemEvent };

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Muted, curated hue set for sender names (DESIGN.md §1). */
const NAME_HUES = [
  "text-indigo-600 dark:text-indigo-400",
  "text-teal-600 dark:text-teal-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-500 dark:text-rose-400",
  "text-sky-600 dark:text-sky-400",
  "text-violet-600 dark:text-violet-400",
] as const;

function hueFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return NAME_HUES[hash % NAME_HUES.length];
}

export default function MessageList({ messages, systemEvents, myNickname }: MessageListProps) {
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...messages.map((m) => ({ kind: "message" as const, key: m.id, ts: m.ts, data: m })),
      ...systemEvents.map((s) => ({ kind: "system" as const, key: s.id, ts: s.ts, data: s })),
    ];
    entries.sort((a, b) => a.ts - b.ts);
    return entries;
  }, [messages, systemEvents]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);

  const handleScroll = (): void => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 120;
  };

  useEffect(() => {
    const last = timeline[timeline.length - 1];
    const isOwn = last?.kind === "message" && last.data.nickname === myNickname;
    if (nearBottomRef.current || isOwn) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [timeline, myNickname]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
    >
      {timeline.length === 0 ? (
        <p className="mt-8 text-center text-[13px] text-zinc-400 dark:text-zinc-500">
          아직 메시지가 없어요. 첫 메시지를 보내보세요.
        </p>
      ) : (
        <div className="flex flex-col gap-2" aria-live="polite">
          {timeline.map((entry, index) => {
            if (entry.kind === "system") {
              return (
                <div
                  key={entry.key}
                  className="chat-rise py-1 text-center text-[12px] text-zinc-500 dark:text-zinc-400"
                >
                  {entry.data.text}
                </div>
              );
            }

            const message = entry.data;
            const own = message.nickname === myNickname;
            const prev = timeline[index - 1];
            const showName =
              prev === undefined ||
              prev.kind !== "message" ||
              prev.data.nickname !== message.nickname;

            if (own) {
              return (
                <div key={entry.key} className="chat-rise flex flex-col items-end gap-1">
                  <div className="max-w-[88%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-[15px] leading-6 text-zinc-50 [overflow-wrap:anywhere] whitespace-pre-wrap sm:max-w-[80%]">
                    {message.text}
                  </div>
                  <time
                    dateTime={new Date(message.ts).toISOString()}
                    className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500"
                  >
                    {timeFormatter.format(message.ts)}
                  </time>
                </div>
              );
            }

            return (
              <div key={entry.key} className="chat-rise flex flex-col items-start gap-1">
                {showName && (
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[12px] font-semibold ${hueFor(message.nickname)}`}>
                      {message.nickname}
                    </span>
                    <time
                      dateTime={new Date(message.ts).toISOString()}
                      className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500"
                    >
                      {timeFormatter.format(message.ts)}
                    </time>
                  </div>
                )}
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-zinc-200/70 bg-white px-3.5 py-2 text-[15px] leading-6 text-zinc-900 [overflow-wrap:anywhere] whitespace-pre-wrap sm:max-w-[80%] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100">
                  {message.text}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
