import { randomUUID } from "node:crypto";
import { findCountryByGuess } from "../src/lib/countries";
import {
  GAME_DURATION_MS,
  PLAYER_COLORS,
} from "../src/shared/constants";
import type {
  GameResult,
  Player,
  RoomState,
  UsedCountry,
} from "../src/shared/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function createRoom(nickname: string): { room: RoomState; playerId: string } {
  const playerId = randomUUID();
  const room: RoomState = {
    code: makeRoomCode(),
    ownerId: playerId,
    players: [
      {
        id: playerId,
        nickname,
        color: PLAYER_COLORS[0],
        connected: true,
        score: 0,
        isHost: true,
      },
    ],
    status: "waiting",
    usedCountries: [],
    remainingMs: GAME_DURATION_MS,
    endsAt: null,
    durationMs: GAME_DURATION_MS,
    result: null,
    createdAt: Date.now(),
  };
  return { room, playerId };
}

export function joinRoom(room: RoomState, nickname: string): Player {
  const player: Player = {
    id: randomUUID(),
    nickname,
    color: PLAYER_COLORS[1],
    connected: true,
    score: 0,
    isHost: false,
  };
  room.players.push(player);
  return player;
}

export function startGame(room: RoomState): void {
  room.status = "playing";
  room.usedCountries = [];
  room.result = null;
  for (const player of room.players) player.score = 0;
  room.endsAt = Date.now() + room.durationMs;
  room.remainingMs = room.durationMs;
}

export function computeResult(room: RoomState): GameResult {
  const scores: Record<string, number> = {};
  for (const player of room.players) scores[player.id] = player.score;

  const [p1, p2] = room.players;
  const s1 = p1?.score ?? 0;
  const s2 = p2?.score ?? 0;

  if (s1 === s2) {
    return { winnerId: null, winnerNickname: null, draw: true, scores };
  }
  const winner = s1 > s2 ? p1 : p2;
  return {
    winnerId: winner.id,
    winnerNickname: winner.nickname,
    draw: false,
    scores,
  };
}

export function finishGame(room: RoomState): void {
  if (room.status === "finished") return;
  room.status = "finished";
  room.endsAt = null;
  room.remainingMs = 0;
  room.result = computeResult(room);
}

/** Reset state untuk rematch, lalu langsung mulai ronde baru jika memungkinkan. */
export function rematch(room: RoomState): boolean {
  const canStart = room.players.length >= 2;
  if (canStart) {
    startGame(room);
  } else {
    room.status = "waiting";
    room.usedCountries = [];
    room.result = null;
    room.remainingMs = room.durationMs;
    room.endsAt = null;
    for (const player of room.players) player.score = 0;
  }
  return canStart;
}

export type GuessOutcome =
  | { kind: "correct"; countryName: string; flag: string }
  | { kind: "invalid" }
  | { kind: "duplicate" }
  | { kind: "ignored"; reason: string };

/** Validasi + mutasi state. Server adalah satu-satunya penentu jawaban benar/salah. */
export function applyGuess(
  room: RoomState,
  playerId: string,
  rawGuess: string,
): GuessOutcome {
  if (room.status !== "playing") {
    return { kind: "ignored", reason: "Game belum dimulai atau sudah selesai" };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { kind: "ignored", reason: "Pemain tidak ditemukan" };

  const country = findCountryByGuess(rawGuess);
  if (!country) return { kind: "invalid" };

  const isUsed = room.usedCountries.some((u) => u.ccn3 === country.ccn3);
  if (isUsed) return { kind: "duplicate" };

  const used: UsedCountry = {
    ccn3: country.ccn3,
    name: country.name,
    ownerId: playerId,
    ownerNickname: player.nickname,
    at: Date.now(),
  };
  room.usedCountries.push(used);
  player.score += 1;

  return { kind: "correct", countryName: country.name, flag: country.flag };
}
