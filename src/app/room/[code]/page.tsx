"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { loadSession } from "@/lib/session";
import { Room } from "@/components/Room";
import { Game } from "@/components/Game";
import { Result } from "@/components/Result";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code ?? "").toUpperCase();
  const { room, reconnect, notice, leaveRoom } = useGame();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const session = loadSession();
    if (!session || session.roomCode !== code) {
      router.replace("/");
      return;
    }
    reconnect(code, session.playerId);
  }, [code, reconnect, router]);

  if (!room || room.code !== code) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-sm text-center">
          {!notice ? (
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-fg-muted" />
          ) : (
            <div className="border-l-2 border-l-signal-bad bg-ink-900 px-4 py-3 text-left text-xs text-fg">
              {notice.message}
            </div>
          )}
          <p className="mt-4 font-mono text-xs text-fg-faint">Menghubungkan ke room {code}</p>
          <button
            type="button"
            onClick={leaveRoom}
            className="mt-4 text-xs text-fg-muted underline underline-offset-4 transition-colors duration-150 hover:text-fg"
          >
            Kembali ke lobby
          </button>
        </div>
      </main>
    );
  }

  if (room.status === "waiting") return <Room />;
  if (room.status === "playing") return <Game />;
  return <Result />;
}
