import { Crosshair } from "lucide-react";

/** Pembatas berupa garis peta dengan tanda reticle — detail khas MapRush. */
export function MapRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <Crosshair size={12} strokeWidth={1.5} className="text-fg-faint" />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
