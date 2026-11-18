"use client";

import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { GAME_DURATION_MS } from "@/shared/constants";

export function Countdown() {
  const { room, connection } = useGame();
  if (!room) return null;

  const count = Math.max(1, Math.ceil((room.countdownMs ?? 0) / 1000));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 sm:px-6">
      <AppBar
        status={connection}
        aside={<span className="font-mono text-xs text-fg-faint">room {room.code}</span>}
      />

      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <p className="font-mono text-xs text-accent">Bersiap</p>
        <div
          key={count}
          className="mt-4 animate-enter font-mono text-[112px] font-medium leading-none tnum sm:text-[160px]"
        >
          {count}
        </div>
        <p className="mt-6 max-w-sm text-sm text-fg-muted">
          {room.mode === "solo"
            ? "Sebut sebanyak mungkin negara dalam waktu yang tersedia."
            : "Kedua pemain siap. Negara pertama yang disebut menjadi milikmu."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {room.players.map((player) => (
            <span key={player.id} className="flex items-center gap-2 text-xs text-fg-muted">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: player.color }}
              />
              {player.nickname}
            </span>
          ))}
        </div>

        <p className="mt-10 font-mono text-[11px] text-fg-faint">
          {GAME_DURATION_MS / 1000} detik · mode bebas
        </p>
      </div>
    </main>
  );
}
