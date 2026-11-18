export type PlayerId = string;

export type GameMode = "duel" | "solo";

export type GameType = "world-conquest" | "country-hunt" | "continent-rush";

export type Continent =
  | "Asia"
  | "Europe"
  | "Africa"
  | "North America"
  | "South America"
  | "Oceania";

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

/** Target negara pada Country Hunt. questionId mencegah jawaban lama diproses. */
export interface HuntTarget {
  questionId: string;
  ccn3: string;
  name: string;
}

export interface HuntFeedback {
  playerId: PlayerId;
  ccn3: string;
  kind: "correct" | "wrong";
  at: number;
}

export interface HuntState {
  target: HuntTarget | null;
  usedTargets: string[];
  feedback: HuntFeedback[];
  lastWinnerId: PlayerId | null;
  round: number;
}

export interface RushState {
  order: Continent[];
  index: number;
  active: Continent | null;
  nextAt: number | null;
  remainingMs: number;
  round: number;
}

/**
 * RoomState adalah source of truth untuk satu pertandingan.
 * Disimpan di server (in-memory untuk MVP), bukan di browser.
 */
export interface RoomState {
  code: string;
  mode: GameMode;
  gameType: GameType;
  maxPlayers: number;
  ownerId: PlayerId;
  players: Player[];
  status: GameStatus;
  usedCountries: UsedCountry[];
  remainingMs: number;
  endsAt: number | null;
  durationMs: number;
  countdownMs: number;
  countdownEndsAt: null | number;
  result: GameResult | null;
  hunt: HuntState | null;
  rush: RushState | null;
  createdAt: number;
}
