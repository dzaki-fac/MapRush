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
      <div className="grid min-h-0 flex-1 place-items-center bg-ink-950/50 p-2">
        <div className="flex h-full min-h-0 w-full items-center justify-center">
          {children}
        </div>
      </div>
    </Panel>
  );
}
