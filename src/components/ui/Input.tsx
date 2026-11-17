"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="field-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <input className={`field ${className}`} {...props} />
      {hint && <p className="mt-2 text-xs text-fg-faint">{hint}</p>}
    </div>
  );
}
