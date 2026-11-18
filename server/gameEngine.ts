import { randomUUID } from "node:crypto";
import {
  COUNTDOWN_MS,
  GAME_DURATION_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  RUSH_DURATION_MS,
} from "../src/shared/constants";
import type {
  GameResult,
  GameType,
  Player,
  RoomState,
} from "../src/shared/types";

export function durationForGameType(gameType: GameType): number {
  return gameType === "continent-rush" ? RUSH_DURATION_MS : GAME_DURATION_MS;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function createRoom(
  nickname: string,
  gameType: GameType = "world-conquest",
): { room: RoomState; playerId: string } {
  const playerId = randomUUID();
  const room: RoomState = {
    code: makeRoomCode(),
    mode: "duel",
    gameType,
    maxPlayers: MIN_PLAYERS,
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
    remainingMs: durationForGameType(gameType),
    endsAt: null,
    durationMs: durationForGameType(gameType),
    countdownMs: COUNTDOWN_MS,
    countdownEndsAt: null,
    result: null,
    hunt: null,
    rush: null,
    createdAt: Date.now(),
  };
  return { room, playerId };
}

export function joinRoom(room: RoomState, nickname: string): Player {
  const player: Player = {
    id: randomUUID(),
    nickname,
    color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
    connected: true,
    score: 0,
    isHost: false,
  };
  room.players.push(player);
  return player;
}

export function clampMaxPlayers(value: unknown, current: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_PLAYERS;
  return Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, current, Math.floor(parsed)),
  );
}

function prepareRound(room: RoomState): void {
  room.usedCountries = [];
  room.hunt = null;
  room.rush = null;
  room.result = null;
  room.remainingMs = room.durationMs;
  room.endsAt = null;
  room.countdownEndsAt = null;
  for (const player of room.players) player.score = 0;
}

/** Fase hitung mundur; server yang menentukan kapan game benar-benar dimulai. */
export function startCountdown(room: RoomState): void {
  prepareRound(room);
  room.status = "countdown";
  room.countdownMs = COUNTDOWN_MS;
  room.countdownEndsAt = Date.now() + COUNTDOWN_MS;
}

export function startGame(room: RoomState): void {
  prepareRound(room);
  room.status = "playing";
  room.endsAt = Date.now() + room.durationMs;
}

export function requiredPlayers(room: RoomState): number {
  return room.mode === "solo" ? 1 : MIN_PLAYERS;
}

export function computeResult(room: RoomState): GameResult {
  const scores: Record<string, number> = {};
  for (const player of room.players) scores[player.id] = player.score;

  let topScore = -1;
  let leaders: Player[] = [];
  for (const player of room.players) {
    if (player.score > topScore) {
      topScore = player.score;
      leaders = [player];
    } else if (player.score === topScore) {
      leaders.push(player);
    }
  }

  // Skor sama (termasuk semua 0) atau beberapa pemain seri di puncak => draw.
  if (leaders.length !== 1) {
    return { winnerId: null, winnerNickname: null, draw: true, scores };
  }
  return {
    winnerId: leaders[0].id,
    winnerNickname: leaders[0].nickname,
    draw: false,
    scores,
  };
}

export function finishGame(room: RoomState): void {
  if (room.status === "finished") return;
  room.status = "finished";
  room.endsAt = null;
  room.countdownEndsAt = null;
  room.remainingMs = 0;
  room.result = computeResult(room);
}

/** Reset state untuk rematch, lalu langsung mulai ronde baru jika memungkinkan. */
export function rematch(room: RoomState): boolean {
  const canStart =
    room.players.filter((p) => p.connected).length >= requiredPlayers(room);
  if (canStart) {
    startCountdown(room);
  } else {
    prepareRound(room);
    room.status = "waiting";
    room.countdownMs = COUNTDOWN_MS;
  }
  return canStart;
}

/** Validasi dan mutasi jawaban kini ada di server/modes/<game-type>.ts. */
