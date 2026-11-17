"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Graticule } from "react-simple-maps";
import type { Player, UsedCountry } from "@/shared/types";

const GEOGRAPHY_URL = "/geographies/countries-110m.json";
const DEFAULT_FILL = "#233038";

interface WorldMapProps {
  usedCountries: UsedCountry[];
  players: Player[];
}

export default function WorldMap({ usedCountries, players }: WorldMapProps) {
  const colorByCode = useMemo(() => {
    const colorByPlayer = new Map(players.map((p) => [p.id, p.color]));
    const map = new Map<string, string>();
    for (const used of usedCountries) {
      const code = String(Number(used.ccn3));
      const color = colorByPlayer.get(used.ownerId);
      if (color) map.set(code, color);
    }
    return map;
  }, [usedCountries, players]);

  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{ scale: 165, center: [0, 12] }}
      width={1000}
      height={520}
      className="h-auto w-full"
    >
      <Graticule stroke="#2b353c" strokeWidth={0.25} />
      <Geographies geography={GEOGRAPHY_URL}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const code = String(Number(geo.id));
            const ownerColor = colorByCode.get(code);
            const fill = ownerColor ?? DEFAULT_FILL;
            const name = (geo.properties as { name?: string } | null)?.name ?? "Negara";

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fill}
                stroke="#10161a"
                strokeWidth={0.5}
                className={ownerColor ? "country country-owned" : "country country-free"}
                style={{
                  transition: "fill 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <title>{name}</title>
              </Geography>
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}
