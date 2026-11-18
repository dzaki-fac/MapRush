import type { GameType } from "./types";


/** Pesan yang dikirim browser -> WebSocket server. */
export type ClientMessage =
  | { type: "CREATE_ROOM"; nickname: string; gameType?: GameType }
  | { type: "CREATE_SOLO"; nickname: string; gameType?: GameType }
  | { type: "JOIN_ROOM"; roomCode: string; nickname: string }
  | { type: "RECONNECT"; roomCode: string; playerId: string }
  | { type: "SET_GAME_TYPE"; roomCode: string; playerId: string; gameType: GameType }
  | { type: "SET_MAX_PLAYERS"; roomCode: string; playerId: string; maxPlayers: number }
  | { type: "START_GAME"; roomCode: string; playerId: string }
  | { type: "SUBMIT_GUESS"; roomCode: string; playerId: string; guess: string }
  | {
      type: "SUBMIT_CLICK";
      roomCode: string;
      playerId: string;
      questionId: string;
      ccn3: string;
    }
  | { type: "REMATCH"; roomCode: string; playerId: string }
  | { type: "LEAVE_ROOM"; roomCode: string; playerId: string };

export type NoticeKind =
  | "correct"
  | "invalid"
  | "duplicate"
  | "wrong-continent"
  | "info"
  | "error"
  | "continent";

/** Pesan yang dikirim WebSocket server -> browser. */
export type ServerMessage =
  | { type: "STATE"; room: import("./types").RoomState }
  | {
      type: "JOINED";
      roomCode: string;
      playerId: string;
      room: import("./types").RoomState;
    }
  | {
      type: "NOTICE";
      kind: NoticeKind;
      message: string;
      countryName?: string;
    }
  | { type: "ERROR"; message: string };
