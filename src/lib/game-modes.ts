import type { GameType } from "@/shared/types";

export interface GameModeInfo {
  id: GameType;
  name: string;
  description: string;
  detail: string;
  duration: number;
}

export const GAME_MODES: readonly GameModeInfo[] = [
  {
    id: "world-conquest",
    name: "World Conquest",
    description: "Sebut negara, klaim wilayah di peta",
    detail: "Jawaban benar +1 poin. Negara tidak bisa diulang oleh siapa pun.",
    duration: 90,
  },
  {
    id: "country-hunt",
    name: "Country Hunt",
    description: "Klik lokasi negara yang diminta sistem",
    detail: "Tepat +5, salah -1 (minimum 0). Siapa cepat, dia dapat.",
    duration: 90,
  },
  {
    id: "continent-rush",
    name: "Continent Rush",
    description: "Sebut negara dari benua yang sedang aktif",
    detail: "Tiap negara benar +1. Benua berganti setiap 20 detik.",
    duration: 120,
  },
];

export function modeInfo(gameType: GameType): GameModeInfo {
  return GAME_MODES.find((mode) => mode.id === gameType) ?? GAME_MODES[0];
}
