import { WebSocket, WebSocketServer } from "ws";
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

const PORT = Number(process.env.PORT ?? 8080);

const store = new InMemoryRoomStore();
const playerSockets = new Map<string, WebSocket>();
const socketMeta = new Map<WebSocket, { roomCode: string; playerId: string }>();
const timers = new Map<string, ReturnType<typeof setInterval>>();

const wss = new WebSocketServer({ port: PORT });

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("[maprush] failed to send message", error);
  }
}

function sendError(ws: WebSocket, message: string) {
  send(ws, { type: "ERROR", message });
}

function sendNotice(ws: WebSocket, kind: NoticeKind, message: string, countryName?: string) {
  send(ws, { type: "NOTICE", kind, message, countryName });
}

function broadcast(room: RoomState, message: ServerMessage) {
  for (const player of room.players) {
    const socket = playerSockets.get(player.id);
    if (socket) send(socket, message);
  }
}

function broadcastState(room: RoomState) {
  broadcast(room, { type: "STATE", room });
}

function bindSocket(ws: WebSocket, roomCode: string, playerId: string) {
  const previousMeta = socketMeta.get(ws);
  if (previousMeta && previousMeta.playerId !== playerId) {
    playerSockets.delete(previousMeta.playerId);
  }
  socketMeta.set(ws, { roomCode, playerId });
  playerSockets.set(playerId, ws);
}

function cleanNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nickname = value.trim().replace(/\s+/g, " ").slice(0, MAX_NICKNAME_LENGTH);
  return nickname.length ? nickname : null;
}

function stopTimer(roomCode: string) {
  const timer = timers.get(roomCode);
  if (timer) clearInterval(timer);
  timers.delete(roomCode);
}

function startTimer(room: RoomState) {
  stopTimer(room.code);
  const timer = setInterval(() => {
    const current = store.get(room.code);
    if (!current || current.status !== "playing") {
      stopTimer(room.code);
      return;
    }

    const remaining = Math.max(0, (current.endsAt ?? Date.now()) - Date.now());
    current.remainingMs = remaining;

    if (remaining <= 0) {
      engine.finishGame(current);
      stopTimer(current.code);
    }
    broadcastState(current);
  }, 1000);
  timers.set(room.code, timer);
}

function handleConnection(ws: WebSocket) {
  ws.on("message", (raw: RawData) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return sendError(ws, "Format pesan tidak valid");
    }

    switch (message.type) {
      case "CREATE_ROOM": {
        const nickname = cleanNickname(message.nickname);
        if (!nickname) return sendError(ws, "Nickname wajib diisi");

        let created = engine.createRoom(nickname);
        while (store.get(created.room.code)) created = engine.createRoom(nickname);

        store.set(created.room.code, created.room);
        bindSocket(ws, created.room.code, created.playerId);
        send(ws, {
          type: "JOINED",
          roomCode: created.room.code,
          playerId: created.playerId,
          room: created.room,
        });
        break;
      }

      case "JOIN_ROOM": {
        const code = (message.roomCode ?? "").trim().toUpperCase();
        const room = store.get(code);
        if (!room) return sendError(ws, "Room tidak ditemukan");
        if (room.status !== "waiting") return sendError(ws, "Game sudah dimulai");
        if (room.players.length >= 2) return sendError(ws, "Room sudah penuh");

        const nickname = cleanNickname(message.nickname);
        if (!nickname) return sendError(ws, "Nickname wajib diisi");

        const player = engine.joinRoom(room, nickname);
        bindSocket(ws, room.code, player.id);
        send(ws, {
          type: "JOINED",
          roomCode: room.code,
          playerId: player.id,
          room,
        });
        broadcastState(room);
        break;
      }

      case "RECONNECT": {
        const code = (message.roomCode ?? "").trim().toUpperCase();
        const room = store.get(code);
        const player = room?.players.find((p) => p.id === message.playerId);
        if (!room || !player) {
          return sendError(ws, "Sesi tidak ditemukan. Silakan kembali ke lobby.");
        }
        bindSocket(ws, room.code, player.id);
        player.connected = true;
        send(ws, {
          type: "JOINED",
          roomCode: room.code,
          playerId: player.id,
          room,
        });
        broadcastState(room);
        break;
      }

      case "START_GAME": {
        const room = store.get(message.roomCode);
        if (!room) return sendError(ws, "Room tidak ditemukan");
        if (room.ownerId !== message.playerId) {
          return sendError(ws, "Hanya host yang bisa memulai game");
        }
        if (room.players.filter((p) => p.connected).length < 2) {
          return sendError(ws, "Butuh 2 pemain untuk memulai");
        }
        engine.startGame(room);
        startTimer(room);
        broadcastState(room);
        break;
      }

      case "SUBMIT_GUESS": {
        const room = store.get(message.roomCode);
        if (!room) return sendError(ws, "Room tidak ditemukan");
        if (!playerSockets.get(message.playerId)) {
          return sendError(ws, "Koneksi pemain tidak ditemukan");
        }

        const guess = typeof message.guess === "string" ? message.guess.slice(0, 100) : "";
        const outcome = engine.applyGuess(room, message.playerId, guess);
        switch (outcome.kind) {
          case "correct":
            sendNotice(ws, "correct", `Benar! +1 — ${outcome.countryName}`, outcome.countryName);
            broadcastState(room);
            break;
          case "invalid":
            sendNotice(ws, "invalid", "Negara tidak valid");
            break;
          case "duplicate":
            sendNotice(ws, "duplicate", "Negara sudah dipakai");
            break;
          case "ignored":
            sendNotice(ws, "info", outcome.reason);
            break;
        }
        break;
      }

      case "REMATCH": {
        const room = store.get(message.roomCode);
        if (!room) return sendError(ws, "Room tidak ditemukan");
        if (room.ownerId !== message.playerId) {
          return sendError(ws, "Hanya host yang bisa memulai rematch");
        }
        const started = engine.rematch(room);
        if (started) startTimer(room);
        else stopTimer(room.code);
        broadcastState(room);
        break;
      }

      case "LEAVE_ROOM": {
        const room = store.get(message.roomCode);
        if (room) removePlayerFromRoom(room, message.playerId);
        const meta = socketMeta.get(ws);
        if (meta?.playerId === message.playerId) {
          socketMeta.delete(ws);
          playerSockets.delete(message.playerId);
        }
        break;
      }

      default:
        sendError(ws, "Jenis pesan tidak dikenal");
    }
  });

  ws.on("close", () => {
    const meta = socketMeta.get(ws);
    if (!meta) return;
    socketMeta.delete(ws);
    playerSockets.delete(meta.playerId);

    const room = store.get(meta.roomCode);
    if (room) removePlayerFromRoom(room, meta.playerId);
  });

  ws.on("error", (error) => {
    console.error("[maprush] socket error", error.message);
  });
}

function removePlayerFromRoom(room: RoomState, playerId: string) {
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.connected = false;

  if (room.status === "playing" && room.players.length >= 2) {
    engine.finishGame(room);
    stopTimer(room.code);
  }
  broadcastState(room);

  if (!room.players.some((p) => p.connected)) {
    stopTimer(room.code);
    store.delete(room.code);
  }
}

wss.on("connection", handleConnection);

console.log(`[maprush] WebSocket server listening on ws://localhost:${PORT}`);
