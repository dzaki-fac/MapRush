"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  ZoomableGroup,
} from "react-simple-maps";
import { CONTINENT_BY_CODE } from "@/data/continent-codes";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/shared/constants";
import type { Continent, HuntFeedback, Player, UsedCountry } from "@/shared/types";

const GEOGRAPHY_URL = "/geographies/countries-110m.json";
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 720;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
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
  showZoomControls?: boolean;
}

export default function WorldMap({
  usedCountries,
  players,
  clickable = false,
  onCountryClick,
  feedback,
  activeContinent = null,
  showZoomControls = true,
}: WorldMapProps) {
  const [zoom, setZoom] = useState(MAP_DEFAULT_ZOOM);
  const [center, setCenter] = useState<[number, number]>([...MAP_DEFAULT_CENTER]);

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

  function changeZoom(next: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 116, center: [0, 0] }}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="h-auto max-h-full w-full"
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          translateExtent={[
            [0, 0],
            [MAP_WIDTH, MAP_HEIGHT],
          ]}
          onMoveEnd={({ coordinates, zoom: nextZoom }) => {
            if (coordinates) setCenter(coordinates);
            if (nextZoom) setZoom(nextZoom);
          }}
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
                  activeContinent &&
                  CONTINENT_BY_CODE[code] !== activeContinent &&
                  !ownerColor
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
                    aria-label={
                      clickable
                        ? String(
                            (geo.properties as { name?: string } | null)?.name ??
                              "Negara",
                          )
                        : undefined
                    }
                    onClick={clickable ? () => onCountryClick?.(code) : undefined}
                    style={{
                      transition: "fill 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {showZoomControls && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => changeZoom(zoom * 1.5)}
            aria-label="Perbesar peta"
            title="Perbesar"
            className="grid h-7 w-7 place-items-center rounded-control border border-line bg-ink-900/85 text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(zoom / 1.5)}
            aria-label="Perkecil peta"
            title="Perkecil"
            className="grid h-7 w-7 place-items-center rounded-control border border-line bg-ink-900/85 text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Minus size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(MAP_DEFAULT_ZOOM);
              setCenter([...MAP_DEFAULT_CENTER]);
            }}
            aria-label="Reset tampilan peta"
            title="Reset tampilan"
            className="grid h-7 w-7 place-items-center rounded-control border border-line bg-ink-900/85 text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <RotateCcw size={13} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
