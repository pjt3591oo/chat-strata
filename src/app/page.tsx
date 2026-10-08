"use client";

import { useCallback, useState } from "react";
import ChatRoom from "@/components/ChatRoom";
import JoinForm from "@/components/JoinForm";

type Session = { room: string; nickname: string };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  // Kept across exits so a bounced join (e.g. duplicate nickname) prefills the form.
  const [lastEntry, setLastEntry] = useState<Session>({ room: "", nickname: "" });
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = useCallback((room: string, nickname: string) => {
    setJoinError(null);
    setLastEntry({ room, nickname });
    setSession({ room, nickname });
  }, []);

  const handleExit = useCallback((errorMessage?: string) => {
    setSession(null);
    setJoinError(errorMessage ?? null);
  }, []);

  if (session) {
    return (
      <ChatRoom
        key={`${session.room}:${session.nickname}`}
        room={session.room}
        nickname={session.nickname}
        onExit={handleExit}
      />
    );
  }

  return (
    <JoinForm
      initialNickname={lastEntry.nickname}
      initialRoom={lastEntry.room}
      serverError={joinError}
      onJoin={handleJoin}
    />
  );
}
