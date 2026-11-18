"use client";

import type { Notice } from "@/context/GameContext";
import { NoticeBanner } from "@/components/NoticeBanner";
import type { RoomState } from "@/shared/types";

export function NoticeOverlay({ notice }: { notice: Notice | null }) {
  return (
    <div className="relative z-10 mt-3 h-0 shrink-0">
      {notice && (
        <div className="absolute inset-x-0 top-0">
          <NoticeBanner notice={notice} />
        </div>
      )}
    </div>
  );
}

export function GameFooter({ room }: { room: RoomState }) {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between border-t border-line text-[11px] text-fg-faint">
      <span>MapRush</span>
      <span>
        room {room.code} · {room.players.length} pemain ·{" "}
        {room.durationMs / 1000} detik
      </span>
    </footer>
  );
}

export function TimerLabel({
  seconds,
  urgent,
}: {
  seconds: number;
  urgent: boolean;
}) {
  const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
  return (
    <span
      className={`font-mono text-[15px] leading-none tnum ${
        urgent ? "text-signal-bad" : "text-fg"
      }`}
      title="Sisa waktu"
    >
      {label}
    </span>
  );
}
