"use client";

import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";
import type { Notice } from "@/context/GameContext";

const styles = {
  correct: { border: "border-l-signal-good", text: "text-signal-good", Icon: Check },
  invalid: { border: "border-l-signal-bad", text: "text-signal-bad", Icon: X },
  duplicate: { border: "border-l-signal-warn", text: "text-signal-warn", Icon: AlertTriangle },
  info: { border: "border-l-signal-info", text: "text-signal-info", Icon: Info },
  error: { border: "border-l-signal-bad", text: "text-signal-bad", Icon: AlertCircle },
} as const;

export function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const { border, text, Icon } = styles[notice.kind];

  return (
    <div
      key={notice.id}
      role="status"
      className={`flex animate-enter items-start gap-2.5 border-l-2 bg-ink-850 px-3 py-2.5 ${border}`}
    >
      <Icon size={14} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${text}`} aria-hidden="true" />
      <p className="text-xs leading-relaxed text-fg">{notice.message}</p>
    </div>
  );
}
