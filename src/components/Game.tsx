"use client";

import { useGame } from "@/context/GameContext";
import { ContinentRushGame } from "@/components/games/ContinentRushGame";
import { CountryHuntGame } from "@/components/games/CountryHuntGame";
import { WorldConquestGame } from "@/components/games/WorldConquestGame";

/** Router layar game — logika tiap mode hidup di komponen masing-masing. */
export function Game() {
  const { room } = useGame();
  if (!room) return null;

  if (room.gameType === "country-hunt") return <CountryHuntGame />;
  if (room.gameType === "continent-rush") return <ContinentRushGame />;
  return <WorldConquestGame />;
}
