"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Graticule } from "react-simple-maps";
import { CONTINENT_BY_CODE } from "@/data/continent-codes";
import type { Continent, HuntFeedback, Player, UsedCountry } from "@/shared/types";

const GEOGRAPHY_URL = "/geographies/countries-110m.json";
const DEFAULT_FILL = "#233038";
const ACTIVE_CONTINENT_FILL = "#2c4644";
const DIM_CONTINENT_FILL = "#1b242b";

interface WorldMapProps {
  usedCountries: UsedCountry[];
  players: Player[];
  clickable?: boolean;
  onCountryClick?: (ccn3: string) => void;
  feedback?: HuntFeedback | null;
  activeContinent?: Continent | null;
}

export default function WorldMap({
  usedCountries,
  players,
  clickable = false,
  onCountryClick,
  feedback,
  activeContinent = null,
}: WorldMapProps) {
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
      projectionConfig={{ scale: 180, center: [0, 12] }}
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
            const isFeedbackCountry = feedback?.ccn3 === code;

            let fill = ownerColor ?? DEFAULT_FILL;
            if (isFeedbackCountry) {
              fill = feedback.kind === "correct" ? "#4ade80" : "#f87171";
            } else if (!ownerColor && activeContinent) {
              fill =
                CONTINENT_BY_CODE[code] === activeContinent
                  ? ACTIVE_CONTINENT_FILL
                  : DIM_CONTINENT_FILL;
            }

            const classes = [
              "country",
              clickable ? "country-clickable" : "",
              isFeedbackCountry
                ? feedback?.kind === "correct"
                  ? "country-feedback-correct"
                  : "country-feedback-wrong"
                : "",
              activeContinent && CONTINENT_BY_CODE[code] !== activeContinent && !ownerColor
                ? "country-dimmed"
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fill}
                stroke="#10161a"
                strokeWidth={0.5}
                tabIndex={-1}
                className={classes}
                role={clickable ? "button" : undefined}
                aria-label={clickable ? String((geo.properties as { name?: string } | null)?.name ?? "Negara") : undefined}
                onClick={clickable ? () => onCountryClick?.(code) : undefined}
                style={{ transition: "fill 220ms cubic-bezier(0.22, 1, 0.36, 1)" }}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}
