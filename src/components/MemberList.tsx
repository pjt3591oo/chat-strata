"use client";

type MemberListProps = {
  members: string[];
  myNickname: string;
};

export default function MemberList({ members, myNickname }: MemberListProps) {
  return (
    <aside
      aria-label="참가자 목록"
      className="hidden w-56 shrink-0 flex-col border-l border-zinc-200/70 bg-white md:flex dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex items-baseline justify-between border-b border-zinc-200/70 px-4 py-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">참가자</h2>
        <span className="font-mono text-[12px] tabular-nums text-zinc-500 dark:text-zinc-400">
          {members.length}명
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {members.map((member) => (
          <li
            key={member}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400"
            />
            <span className="min-w-0 truncate">{member}</span>
            {member === myNickname && (
              <span className="ml-auto shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                나
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
