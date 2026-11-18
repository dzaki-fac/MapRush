import { WebSocket } from "ws";
import type { RawData } from "ws";
import { InMemoryRoomStore } from "./gameStore";
import * as engine from "./gameEngine";
import { getModeHandler, type AnswerOutcome } from "./modes";
import { COUNTDOWN_MS, MAX_NICKNAME_LENGTH } from "../src/shared/constants";
import type {
  ClientMessage,
  NoticeKind,
  ServerMessage,
} from "../src/shared/protocol";
import type { GameType, RoomState } from "../src/shared/types";

/**
 * Seluruh logika server game, tanpa transport/listener.
 * Dipakai baik oleh WS server mandiri (development) maupun oleh Route Handler
 * `/api/ws` di Vercel Functions via `upgradeWebSocket()`.
 */
export class GameServer {
  private store = new InMemoryRoomStore();
  private playerSockets = new Map<string, WebSocket>();
  private socketMeta = new Map<WebSocket, { roomCode: string; playerId: string }>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private countdownTimers = new Map<string, ReturnType<typeof setInterval>>();

  private send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("[maprush] failed to send message", error);
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.send(ws, { type: "ERROR", message });
  }

  private sendNotice(ws: WebSocket, kind: NoticeKind, message: string) {
    this.send(ws, { type: "NOTICE", kind, message });
  }

  private broadcast(room: RoomState, message: ServerMessage) {
    for (const player of room.players) {
      const socket = this.playerSockets.get(player.id);
      if (socket) this.send(socket, message);
    }
  }

  private broadcastNotice(room: RoomState, kind: NoticeKind, message: string) {
    this.broadcast(room, { type: "NOTICE", kind, message });
  }

  private broadcastState(room: RoomState) {
    this.broadcast(room, { type: "STATE", room });
  }

  private bindSocket(ws: WebSocket, roomCode: string, playerId: string) {
    const previousMeta = this.socketMeta.get(ws);
    if (previousMeta && previousMeta.playerId !== playerId) {
      this.playerSockets.delete(previousMeta.playerId);
    }
    this.socketMeta.set(ws, { roomCode, playerId });
    this.playerSockets.set(playerId, ws);
  }

  private cleanNickname(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const nickname = value
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_NICKNAME_LENGTH);
    return nickname.length ? nickname : null;
  }

  private cleanGameType(value: unknown): GameType {
    return value === "country-hunt" || value === "continent-rush"
      ? value
      : "world-conquest";
  }

  private stopTimer(roomCode: string) {
    const timer = this.timers.get(roomCode);
    if (timer) clearInterval(timer);
    this.timers.delete(roomCode);
  }

  private stopCountdownTimer(roomCode: string) {
    const timer = this.countdownTimers.get(roomCode);
    if (timer) clearInterval(timer);
    this.countdownTimers.delete(roomCode);
  }

  private startTimer(room: RoomState) {
    this.stopTimer(room.code);
    const mode = getModeHandler(room.gameType);
    const timer = setInterval(() => {
      const current = this.store.get(room.code);
      if (!current || current.status !== "playing") {
        this.stopTimer(room.code);
        return;
      }

      const remaining = Math.max(0, (current.endsAt ?? Date.now()) - Date.now());
      current.remainingMs = remaining;

      const tick = mode.onTick?.(current, Date.now());
      if (tick?.notice) {
        this.broadcastNotice(current, tick.notice.kind, tick.notice.message);
      }
      if (tick?.finish || remaining <= 0) {
        this.stopTimer(current.code);
        engine.finishGame(current);
      }
      this.broadcastState(current);
    }, 1000);
    this.timers.set(room.code, timer);
  }

  private startCountdownTimer(room: RoomState) {
    this.stopCountdownTimer(room.code);
    const timer = setInterval(() => {
      const current = this.store.get(room.code);
      if (!current || current.status !== "countdown") {
        this.stopCountdownTimer(room.code);
        return;
      }

      const remaining = Math.max(
        0,
        (current.countdownEndsAt ?? Date.now()) - Date.now(),
      );
      current.countdownMs = remaining;

      if (remaining <= 0) {
        this.stopCountdownTimer(current.code);
        engine.startGame(current);
        // Mode menyiapkan state khusus tepat saat game mulai (target/benua).
        getModeHandler(current.gameType).onStart(current);
        this.startTimer(current);
      }
      this.broadcastState(current);
    }, 200);
    this.countdownTimers.set(room.code, timer);
  }

  private handleOutcome(
    ws: WebSocket,
    room: RoomState,
    outcome: AnswerOutcome,
  ) {
    this.sendNotice(ws, outcome.noticeKind, outcome.message);
    if (outcome.broadcast) {
      this.broadcastNotice(room, outcome.broadcast.kind, outcome.broadcast.message);
    }
    if (outcome.changed || outcome.finish) {
      if (outcome.finish) {
        this.stopTimer(room.code);
        engine.finishGame(room);
      }
      this.broadcastState(room);
    }
  }

  private removePlayerFromRoom(room: RoomState, playerId: string) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.connected = false;

    // Host keluar -> alihkan kepemimpinan ke pemain lain yang masih terhubung.
    if (room.ownerId === playerId && room.status === "waiting") {
      const successor = room.players.find((p) => p.connected);
      if (successor) {
        room.ownerId = successor.id;
        for (const item of room.players) item.isHost = item.id === successor.id;
      }
    }

    const connected = room.players.filter((p) => p.connected).length;
    const required = engine.requiredPlayers(room);
    if (room.status === "playing" && connected < required) {
      engine.finishGame(room);
      this.stopTimer(room.code);
    }
    if (room.status === "countdown" && connected < required) {
      this.stopCountdownTimer(room.code);
      room.status = "waiting";
      room.countdownMs = COUNTDOWN_MS;
      room.countdownEndsAt = null;
    }
    this.broadcastState(room);

    if (!room.players.some((p) => p.connected)) {
      this.stopTimer(room.code);
      this.stopCountdownTimer(room.code);
      this.store.delete(room.code);
    }
  }

  handleConnection(ws: WebSocket) {
    ws.on("message", (raw: RawData) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return this.sendError(ws, "Format pesan tidak valid");
      }

      switch (message.type) {
        case "CREATE_ROOM":
        case "CREATE_SOLO": {
          const nickname = this.cleanNickname(message.nickname);
          if (!nickname) return this.sendError(ws, "Nickname wajib diisi");

          const gameType = this.cleanGameType(message.gameType);
          let created = engine.createRoom(nickname, gameType);
          while (this.store.get(created.room.code)) {
            created = engine.createRoom(nickname, gameType);
          }

          if (message.type === "CREATE_SOLO") {
            created.room.mode = "solo";
            created.room.maxPlayers = 1;
            engine.startCountdown(created.room);
          }

          this.store.set(created.room.code, created.room);
          this.bindSocket(ws, created.room.code, created.playerId);
          this.send(ws, {
            type: "JOINED",
            roomCode: created.room.code,
            playerId: created.playerId,
            room: created.room,
          });

          if (message.type === "CREATE_SOLO") {
            this.startCountdownTimer(created.room);
            this.broadcastState(created.room);
          }
          break;
        }

        case "JOIN_ROOM": {
          const code = (message.roomCode ?? "").trim().toUpperCase();
          const room = this.store.get(code);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.status !== "waiting") return this.sendError(ws, "Game sudah dimulai");
          if (room.players.length >= room.maxPlayers) {
            return this.sendError(ws, "Room sudah penuh");
          }

          const nickname = this.cleanNickname(message.nickname);
          if (!nickname) return this.sendError(ws, "Nickname wajib diisi");

          const player = engine.joinRoom(room, nickname);
          this.bindSocket(ws, room.code, player.id);
          this.send(ws, {
            type: "JOINED",
            roomCode: room.code,
            playerId: player.id,
            room,
          });
          this.broadcastState(room);
          break;
        }

        case "RECONNECT": {
          const code = (message.roomCode ?? "").trim().toUpperCase();
          const room = this.store.get(code);
          const player = room?.players.find((p) => p.id === message.playerId);
          if (!room || !player) {
            return this.sendError(ws, "Sesi tidak ditemukan. Silakan kembali ke lobby.");
          }
          this.bindSocket(ws, room.code, player.id);
          player.connected = true;
          this.send(ws, {
            type: "JOINED",
            roomCode: room.code,
            playerId: player.id,
            room,
          });
          this.broadcastState(room);
          break;
        }

        case "SET_GAME_TYPE": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.ownerId !== message.playerId) {
            return this.sendError(ws, "Hanya host yang bisa mengganti mode");
          }
          if (room.status !== "waiting") {
            return this.sendError(ws, "Mode tidak bisa diganti saat game berlangsung");
          }
          room.gameType = this.cleanGameType(message.gameType);
          room.durationMs = engine.durationForGameType(room.gameType);
          room.remainingMs = room.durationMs;
          this.broadcastState(room);
          break;
        }

        case "SET_MAX_PLAYERS": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.ownerId !== message.playerId) {
            return this.sendError(ws, "Hanya host yang bisa mengubah kapasitas");
          }
          if (room.status !== "waiting" || room.mode === "solo") {
            return this.sendError(ws, "Kapasitas tidak bisa diubah sekarang");
          }
          room.maxPlayers = engine.clampMaxPlayers(
            message.maxPlayers,
            room.players.length,
          );
          this.broadcastState(room);
          break;
        }

        case "START_GAME": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.ownerId !== message.playerId) {
            return this.sendError(ws, "Hanya host yang bisa memulai game");
          }
          if (
            room.players.filter((p) => p.connected).length <
            engine.requiredPlayers(room)
          ) {
            return this.sendError(ws, "Belum cukup pemain untuk memulai");
          }
          this.stopTimer(room.code);
          this.stopCountdownTimer(room.code);
          engine.startCountdown(room);
          this.startCountdownTimer(room);
          this.broadcastState(room);
          break;
        }

        case "SUBMIT_GUESS": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (!this.playerSockets.get(message.playerId)) {
            return this.sendError(ws, "Koneksi pemain tidak ditemukan");
          }
          const handler = getModeHandler(room.gameType);
          if (!handler.submitGuess) {
            return this.sendError(ws, "Mode ini memakai klik pada peta");
          }
          const guess =
            typeof message.guess === "string" ? message.guess.slice(0, 100) : "";
          this.handleOutcome(
            ws,
            room,
            handler.submitGuess(room, message.playerId, guess),
          );
          break;
        }

        case "SUBMIT_CLICK": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (!this.playerSockets.get(message.playerId)) {
            return this.sendError(ws, "Koneksi pemain tidak ditemukan");
          }
          const handler = getModeHandler(room.gameType);
          if (!handler.submitClick) {
            return this.sendError(ws, "Mode ini memakai jawaban teks");
          }
          const ccn3 = String(Number(message.ccn3));
          this.handleOutcome(
            ws,
            room,
            handler.submitClick(
              room,
              message.playerId,
              String(message.questionId ?? ""),
              ccn3,
            ),
          );
          break;
        }

        case "REMATCH": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.ownerId !== message.playerId) {
            return this.sendError(ws, "Hanya host yang bisa memulai rematch");
          }
          const started = engine.rematch(room);
          this.stopTimer(room.code);
          this.stopCountdownTimer(room.code);
          if (started) this.startCountdownTimer(room);
          this.broadcastState(room);
          break;
        }

        case "LEAVE_ROOM": {
          const room = this.store.get(message.roomCode);
          if (room) this.removePlayerFromRoom(room, message.playerId);
          const meta = this.socketMeta.get(ws);
          if (meta?.playerId === message.playerId) {
            this.socketMeta.delete(ws);
            this.playerSockets.delete(message.playerId);
          }
          break;
        }

        default:
          this.sendError(ws, "Jenis pesan tidak dikenal");
      }
    });

    ws.on("close", () => {
      const meta = this.socketMeta.get(ws);
      if (!meta) return;
      this.socketMeta.delete(ws);
      this.playerSockets.delete(meta.playerId);

      const room = this.store.get(meta.roomCode);
      if (room) this.removePlayerFromRoom(room, meta.playerId);
    });

    ws.on("error", (error) => {
      console.error("[maprush] socket error", error.message);
    });
  }
}
