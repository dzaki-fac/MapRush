"use client";

import type { Player } from "@/shared/types";

function Row({ player, isMe }: { player?: Player; isMe?: boolean }) {
  if (!player) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: player.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-fg-muted">
          {player.nickname}
          {isMe && <span className="text-fg-faint"> · kamu</span>}
        </p>
        <p className="font-mono text-[10px] text-fg-faint">
          {isMe ? "pemain kamu" : "lawan"}
        </p>
      </div>
      <span className="font-mono text-[24px] leading-none tnum">{player.score}</span>
    </div>
  );
}

export function ScoreList({ me, opponent }: { me?: Player; opponent?: Player }) {
  return (
    <div className="space-y-3">
      <Row player={me} isMe />
      {opponent ? (
        <Row player={opponent} />
      ) : (
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-xs text-fg-muted">Mode</span>
          <span className="font-mono text-[11px] text-fg-faint">solo</span>
        </div>
      )}
    </div>
  );
}
