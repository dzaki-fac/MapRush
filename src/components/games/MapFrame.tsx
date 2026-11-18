import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";

export function MapFrame({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <p className="font-mono text-[11px] text-fg-faint">{title}</p>
        {right}
      </div>
      <div className="grid place-items-center bg-ink-950/50 p-2">
        <div className="w-full">{children}</div>
      </div>
    </Panel>
  );
}
