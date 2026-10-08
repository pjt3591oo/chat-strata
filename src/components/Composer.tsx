"use client";

import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { LIMITS } from "@/lib/protocol";

type ComposerProps = {
  /** True while the socket is not connected; blocks input and send. */
  disabled: boolean;
  onSend: (text: string) => boolean;
};

const MAX_GROW_PX = 96;
const COUNTER_THRESHOLD = LIMITS.textMax - 100;

export default function Composer({ disabled, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [sendFailed, setSendFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoGrow = (el: HTMLTextAreaElement): void => {
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, MAX_GROW_PX)}px`;
  };

  const submit = useCallback((): void => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || disabled) return;
    if (onSend(trimmed)) {
      setText("");
      setSendFailed(false);
      const el = textareaRef.current;
      if (el) autoGrow(el);
    } else {
      setSendFailed(true);
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Guard isComposing so Korean IME composition (Enter to confirm a hangul
    // candidate) never sends a half-finished message.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = !disabled && text.trim().length > 0;
  const showCounter = text.length > COUNTER_THRESHOLD;

  return (
    <footer className="border-t border-zinc-200/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      {showCounter && (
        <div className="mb-1.5 flex items-center justify-end gap-3">
          {sendFailed && (
            <span role="status" className="text-[12px] text-red-500 dark:text-red-400">
              전송에 실패했어요. 연결을 확인해 주세요.
            </span>
          )}
          <span
            className={
              "font-mono text-[11px] tabular-nums " +
              (text.length >= LIMITS.textMax
                ? "text-red-500 dark:text-red-400"
                : "text-zinc-400 dark:text-zinc-500")
            }
          >
            {text.length}/{LIMITS.textMax}
          </span>
        </div>
      )}
      {!showCounter && sendFailed && (
        <div role="status" className="mb-1.5 text-[12px] text-red-500 dark:text-red-400">
          전송에 실패했어요. 연결을 확인해 주세요.
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (sendFailed) setSendFailed(false);
            autoGrow(e.target);
          }}
          onKeyDown={handleKeyDown}
          maxLength={LIMITS.textMax}
          disabled={disabled}
          placeholder={
            disabled
              ? "연결이 끊어졌어요. 자동으로 다시 연결하고 있어요."
              : "메시지를 입력하세요. Enter로 전송, Shift+Enter로 줄바꿈"
          }
          aria-label="메시지 입력"
          className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-zinc-200/70 bg-white px-3.5 py-2.5 text-[15px] leading-6 text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-500"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="메시지 전송"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-zinc-50 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4.5 w-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 16V4" />
            <path d="M4 10l6-6 6 6" />
          </svg>
        </button>
      </div>
    </footer>
  );
}
