import { WebSocket } from "ws";
import type { RawData } from "ws";
import { InMemoryRoomStore } from "./gameStore";
import * as engine from "./gameEngine";
import { MAX_NICKNAME_LENGTH } from "../src/shared/constants";
import type {
  ClientMessage,
  NoticeKind,
  ServerMessage,
} from "../src/shared/protocol";
import type { RoomState } from "../src/shared/types";

/**
 * Seluruh logika server game, tanpa transport/listener.
 * Dipakai baik oleh WS server mandiri (development) maupun oleh Route Handler
 * `/api/ws` di Vercel Functions via `upgradeWebSocket()`.
 *
 * Satu instance = satu source of truth untuk room-room yang ditanganinya.
 */
export class GameServer {
  private store = new InMemoryRoomStore();
  private playerSockets = new Map<string, WebSocket>();
  private socketMeta = new Map<WebSocket, { roomCode: string; playerId: string }>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

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

  private sendNotice(
    ws: WebSocket,
    kind: NoticeKind,
    message: string,
    countryName?: string,
  ) {
    this.send(ws, { type: "NOTICE", kind, message, countryName });
  }

  private broadcast(room: RoomState, message: ServerMessage) {
    for (const player of room.players) {
      const socket = this.playerSockets.get(player.id);
      if (socket) this.send(socket, message);
    }
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

  private stopTimer(roomCode: string) {
    const timer = this.timers.get(roomCode);
    if (timer) clearInterval(timer);
    this.timers.delete(roomCode);
  }

  private startTimer(room: RoomState) {
    this.stopTimer(room.code);
    const timer = setInterval(() => {
      const current = this.store.get(room.code);
      if (!current || current.status !== "playing") {
        this.stopTimer(room.code);
        return;
      }

      const remaining = Math.max(0, (current.endsAt ?? Date.now()) - Date.now());
      current.remainingMs = remaining;

      if (remaining <= 0) {
        engine.finishGame(current);
        this.stopTimer(current.code);
      }
      this.broadcastState(current);
    }, 1000);
    this.timers.set(room.code, timer);
  }

  private removePlayerFromRoom(room: RoomState, playerId: string) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.connected = false;

    if (room.status === "playing" && room.players.length >= 2) {
      engine.finishGame(room);
      this.stopTimer(room.code);
    }
    this.broadcastState(room);

    if (!room.players.some((p) => p.connected)) {
      this.stopTimer(room.code);
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
        case "CREATE_ROOM": {
          const nickname = this.cleanNickname(message.nickname);
          if (!nickname) return this.sendError(ws, "Nickname wajib diisi");

          let created = engine.createRoom(nickname);
          while (this.store.get(created.room.code)) created = engine.createRoom(nickname);

          this.store.set(created.room.code, created.room);
          this.bindSocket(ws, created.room.code, created.playerId);
          this.send(ws, {
            type: "JOINED",
            roomCode: created.room.code,
            playerId: created.playerId,
            room: created.room,
          });
          break;
        }

        case "JOIN_ROOM": {
          const code = (message.roomCode ?? "").trim().toUpperCase();
          const room = this.store.get(code);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.status !== "waiting") return this.sendError(ws, "Game sudah dimulai");
          if (room.players.length >= 2) return this.sendError(ws, "Room sudah penuh");

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

        case "START_GAME": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.ownerId !== message.playerId) {
            return this.sendError(ws, "Hanya host yang bisa memulai game");
          }
          if (room.players.filter((p) => p.connected).length < 2) {
            return this.sendError(ws, "Butuh 2 pemain untuk memulai");
          }
          engine.startGame(room);
          this.startTimer(room);
          this.broadcastState(room);
          break;
        }

        case "SUBMIT_GUESS": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (!this.playerSockets.get(message.playerId)) {
            return this.sendError(ws, "Koneksi pemain tidak ditemukan");
          }

          const guess =
            typeof message.guess === "string" ? message.guess.slice(0, 100) : "";
          const outcome = engine.applyGuess(room, message.playerId, guess);
          switch (outcome.kind) {
            case "correct":
              this.sendNotice(
                ws,
                "correct",
                `Benar! +1 — ${outcome.countryName}`,
                outcome.countryName,
              );
              this.broadcastState(room);
              break;
            case "invalid":
              this.sendNotice(ws, "invalid", "Negara tidak valid");
              break;
            case "duplicate":
              this.sendNotice(ws, "duplicate", "Negara sudah dipakai");
              break;
            case "ignored":
              this.sendNotice(ws, "info", outcome.reason);
              break;
          }
          break;
        }

        case "REMATCH": {
          const room = this.store.get(message.roomCode);
          if (!room) return this.sendError(ws, "Room tidak ditemukan");
          if (room.ownerId !== message.playerId) {
            return this.sendError(ws, "Hanya host yang bisa memulai rematch");
          }
          const started = engine.rematch(room);
          if (started) this.startTimer(room);
          else this.stopTimer(room.code);
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
