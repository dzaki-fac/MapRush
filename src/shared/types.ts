export type PlayerId = string;

export type GameMode = "duel" | "solo";

export type GameStatus = "waiting" | "countdown" | "playing" | "finished";

export interface Player {
  id: PlayerId;
  nickname: string;
  color: string;
  connected: boolean;
  score: number;
  isHost: boolean;
}

export interface UsedCountry {
  /** ISO 3166-1 numeric code (string), dipakai untuk mencocokkan dengan geo.id pada peta. */
  ccn3: string;
  name: string;
  ownerId: PlayerId;
  ownerNickname: string;
  at: number;
}

export interface GameResult {
  winnerId: PlayerId | null;
  winnerNickname: string | null;
  draw: boolean;
  scores: Record<PlayerId, number>;
}

/**
 * RoomState adalah source of truth untuk satu pertandingan.
 * Disimpan di server (in-memory untuk MVP), bukan di browser.
 */
export interface RoomState {
  code: string;
  mode: GameMode;
  ownerId: PlayerId;
  players: Player[];
  status: GameStatus;
  usedCountries: UsedCountry[];
  remainingMs: number;
  endsAt: number | null;
  durationMs: number;
  countdownMs: number;
  countdownEndsAt: number | null;
  result: GameResult | null;
  createdAt: number;
}
