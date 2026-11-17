"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSocketUrl } from "@/lib/socketUrl";
import { clearSession, loadSession, saveSession, type Session } from "@/lib/session";
import type {
  ClientMessage,
  NoticeKind,
  ServerMessage,
} from "@/shared/protocol";
import type { RoomState } from "@/shared/types";

export interface Notice {
  id: number;
  kind: NoticeKind;
  message: string;
  countryName?: string;
}

export type ConnectionStatus = "connecting" | "online" | "offline";

interface GameContextValue {
  connection: ConnectionStatus;
  room: RoomState | null;
  playerId: string | null;
  notice: Notice | null;
  createRoom: (nickname: string) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  reconnect: (roomCode: string, playerId: string) => void;
  startGame: () => void;
  submitGuess: (guess: string) => void;
  requestRematch: () => void;
  leaveRoom: () => void;
  clearNotice: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<ClientMessage[]>([]);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const reconnectingRef = useRef(false);

  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [notice, setNoticeState] = useState<Notice | null>(null);

  const showNotice = useCallback(
    (kind: NoticeKind, message: string, countryName?: string) => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      setNoticeState({ id: Date.now(), kind, message, countryName });
      noticeTimerRef.current = setTimeout(() => setNoticeState(null), 2600);
    },
    [],
  );

  const clearNotice = useCallback(() => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNoticeState(null);
  }, []);

  const flushPending = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    while (pendingRef.current.length) {
      socket.send(JSON.stringify(pendingRef.current.shift()));
    }
  }, []);

  const send = useCallback(
    (message: ClientMessage) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        pendingRef.current.push(message);
        if (!socket || socket.readyState === WebSocket.CLOSED) ensureSocket();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleMessage = useCallback(
    (event: MessageEvent<string>) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      switch (message.type) {
        case "STATE":
          setRoom(message.room);
          break;

        case "JOINED": {
          setRoom(message.room);
          setPlayerId(message.playerId);
          const session: Session = {
            roomCode: message.roomCode,
            playerId: message.playerId,
            nickname:
              message.room.players.find((p) => p.id === message.playerId)
                ?.nickname ?? "Player",
          };
          sessionRef.current = session;
          saveSession(session);

          if (reconnectingRef.current) {
            reconnectingRef.current = false;
          } else {
            router.push(`/room/${message.roomCode}`);
          }
          break;
        }

        case "NOTICE":
          showNotice(message.kind, message.message, message.countryName);
          break;

        case "ERROR":
          showNotice("error", message.message);
          break;
      }
    },
    [router, showNotice],
  );

  const ensureSocket = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const url = getSocketUrl();
    if (!url) {
      setConnection("offline");
      return;
    }

    setConnection("connecting");
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnection("online");
      flushPending();
    };

    socket.onmessage = handleMessage;

    socket.onclose = () => {
      setConnection("offline");
      if (socketRef.current === socket) socketRef.current = null;
      if (!sessionRef.current || reconnectTimerRef.current) return;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        const session = sessionRef.current;
        if (!session) return;
        reconnectingRef.current = true;
        send({
          type: "RECONNECT",
          roomCode: session.roomCode,
          playerId: session.playerId,
        });
      }, 1500);
    };

    socket.onerror = () => {
      // onclose akan menangani reconnect
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushPending, handleMessage, send]);

  useEffect(() => {
    sessionRef.current = loadSession();
    ensureSocket();

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [ensureSocket]);

  const withRoom = useCallback(
    (build: (code: string, id: string) => ClientMessage | null) => {
      const session = sessionRef.current ?? loadSession();
      if (!session) return;
      const message = build(session.roomCode, session.playerId);
      if (message) send(message);
    },
    [send],
  );

  const value: GameContextValue = {
    connection,
    room,
    playerId,
    notice,
    createRoom: (nickname) => {
      ensureSocket();
      send({ type: "CREATE_ROOM", nickname });
    },
    joinRoom: (roomCode, nickname) => {
      ensureSocket();
      send({ type: "JOIN_ROOM", roomCode, nickname });
    },
    reconnect: (roomCode, id) => {
      ensureSocket();
      reconnectingRef.current = true;
      send({ type: "RECONNECT", roomCode, playerId: id });
    },
    startGame: () =>
      withRoom((code, id) => ({ type: "START_GAME", roomCode: code, playerId: id })),
    submitGuess: (guess) =>
      withRoom((code, id) => ({
        type: "SUBMIT_GUESS",
        roomCode: code,
        playerId: id,
        guess,
      })),
    requestRematch: () =>
      withRoom((code, id) => ({ type: "REMATCH", roomCode: code, playerId: id })),
    leaveRoom: () => {
      withRoom((code, id) => ({ type: "LEAVE_ROOM", roomCode: code, playerId: id }));
      sessionRef.current = null;
      clearSession();
      setRoom(null);
      setPlayerId(null);
      clearNotice();
      router.push("/");
    },
    clearNotice,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame harus dipakai di dalam GameProvider");
  return context;
}
