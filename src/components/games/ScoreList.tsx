"use client";

import type { Player } from "@/shared/types";

export function ScoreList({
  players,
  playerId,
}: {
  players: Player[];
  playerId: string | null;
}) {
  return (
    <div className="divide-y divide-line">
      {players.map((player) => (
        <div key={player.id} className="flex min-w-0 items-center gap-3 py-2 first:pt-0 last:pb-0">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: player.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-fg-muted">
              {player.nickname}
              {player.id === playerId && <span className="text-fg-faint"> · kamu</span>}
            </p>
            <p className="font-mono text-[10px] text-fg-faint">
              {player.isHost ? "host" : "pemain"}
              {!player.connected ? " · terputus" : ""}
            </p>
          </div>
          <span className="font-mono text-[24px] leading-none tnum">
            {player.score}
          </span>
        </div>
      ))}
    </div>
  );
}
