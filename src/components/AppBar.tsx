"use client";

import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import type { ConnectionStatus } from "@/context/GameContext";

const statusText: Record<ConnectionStatus, string> = {
  online: "Terhubung",
  connecting: "Menghubungkan",
  offline: "Terputus",
};

const statusDot: Record<ConnectionStatus, string> = {
  online: "bg-signal-good",
  connecting: "bg-signal-warn",
  offline: "bg-signal-bad",
};

export function AppBar({
  status,
  aside,
}: {
  status: ConnectionStatus;
  aside?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-control border border-line text-fg-muted">
          <Crosshair size={15} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">MapRush</span>
      </div>
      <div className="flex items-center gap-5">
        {aside}
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
          {statusText[status]}
        </div>
      </div>
    </header>
  );
}
