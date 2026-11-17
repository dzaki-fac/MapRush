import type { RoomState } from "./types";

/** Pesan yang dikirim browser -> WebSocket server. */
export type ClientMessage =
  | { type: "CREATE_ROOM"; nickname: string }
  | { type: "JOIN_ROOM"; roomCode: string; nickname: string }
  | { type: "RECONNECT"; roomCode: string; playerId: string }
  | { type: "START_GAME"; roomCode: string; playerId: string }
  | { type: "SUBMIT_GUESS"; roomCode: string; playerId: string; guess: string }
  | { type: "REMATCH"; roomCode: string; playerId: string }
  | { type: "LEAVE_ROOM"; roomCode: string; playerId: string };

export type NoticeKind = "correct" | "invalid" | "duplicate" | "info" | "error";

/** Pesan yang dikirim WebSocket server -> browser. */
export type ServerMessage =
  | { type: "STATE"; room: RoomState }
  | {
      type: "JOINED";
      roomCode: string;
      playerId: string;
      room: RoomState;
    }
  | {
      type: "NOTICE";
      kind: NoticeKind;
      message: string;
      countryName?: string;
    }
  | { type: "ERROR"; message: string };
