"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[#e7eae8] text-[#101519] font-medium hover:bg-[#f3f5f1] disabled:bg-ink-800 disabled:text-fg-faint",
  secondary:
    "border border-line bg-transparent text-fg hover:border-ink-700 hover:bg-ink-850 disabled:opacity-40",
  quiet: "text-fg-muted hover:text-fg hover:bg-ink-850 disabled:opacity-40",
};

const sizes: Record<Size, string> = {
  md: "h-9 gap-2 px-3 text-sm",
  lg: "h-11 gap-2 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-control font-medium
        transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent
        disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
