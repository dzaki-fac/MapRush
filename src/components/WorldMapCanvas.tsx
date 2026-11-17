"use client";

import dynamic from "next/dynamic";

export const WorldMapCanvas = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[240px] place-items-center font-mono text-xs text-fg-faint">
      Memuat peta…
    </div>
  ),
});
