import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Panel({ className = "", children, ...props }: PanelProps) {
  return (
    <div className={`panel ${className}`} {...props}>
      {children}
    </div>
  );
}
