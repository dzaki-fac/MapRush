"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { loadSession } from "@/lib/session";
import { getSavedNickname, saveNickname } from "@/lib/nicknameCookie";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { Room } from "@/components/Room";
import { Game } from "@/components/Game";
import { Result } from "@/components/Result";
import { Countdown } from "@/components/Countdown";

type GateMode = "checking" | "reconnecting" | "join";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code ?? "").toUpperCase();
  const {
    room,
    connection,
    notice,
    reconnect,
    joinRoom,
    leaveRoom,
  } = useGame();
  const startedRef = useRef(false);

  const [mode, setMode] = useState<GateMode>("checking");
  const [nickname, setNickname] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const session = loadSession();
    if (session?.roomCode === code) {
      setMode("reconnecting");
      setNickname(session.nickname);
      reconnect(code, session.playerId);
      return;
    }

    // Pengunjung baru dari link undangan: langsung ke form nickname.
    setMode("join");
    setNickname(session?.nickname || getSavedNickname());
  }, [code, reconnect]);

  useEffect(() => {
    if (notice?.kind === "error") setJoinError(notice.message);
  }, [notice]);

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return;
    setJoinError(null);
    saveNickname(nickname.trim());
    joinRoom(code, nickname.trim());
  }

  if (room && room.code === code) {
    if (room.status === "waiting") return <Room />;
    if (room.status === "countdown") return <Countdown />;
    if (room.status === "playing") return <Game />;
    return <Result />;
  }

  if (mode === "join") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[880px] flex-col px-4 sm:px-6">
        <AppBar status={connection} />

        <div className="flex flex-1 items-center py-10 sm:py-14">
          <div className="w-full max-w-md">
            <p className="font-mono text-xs text-accent">Bergabung ke room</p>
            <h1 className="mt-2 text-[28px] font-medium tracking-[-0.02em] sm:text-[32px]">
              Room {code}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              Masukkan nickname untuk bergabung dengan pertandingan ini.
            </p>

            <Panel className="mt-8 p-6">
              {joinError && (
                <div className="mb-5 border-l-2 border-l-signal-bad bg-ink-850 px-3 py-2.5">
                  <p className="text-xs text-fg">{joinError}</p>
                </div>
              )}
              {!joinError && notice && (
                <div className="mb-5">
                  <NoticeBanner notice={notice} />
                </div>
              )}

              <form onSubmit={handleJoin} className="space-y-4">
                <Input
                  id="join-nickname"
                  label="Nickname"
                  placeholder="Misal: TukangPeta"
                  autoComplete="off"
                  maxLength={16}
                  autoFocus
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (joinError) setJoinError(null);
                  }}
                />
                <Button type="submit" size="lg" className="w-full" disabled={!nickname.trim()}>
                  Gabung room
                </Button>
              </form>

              <div className="mt-6 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-xs text-fg-muted underline underline-offset-4 transition-colors duration-150 hover:text-fg"
                >
                  Kembali ke lobby
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        {!notice ? (
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-fg-muted" />
        ) : (
          <div className="border-l-2 border-l-signal-bad bg-ink-900 px-4 py-3 text-left text-xs text-fg">
            {notice.message}
          </div>
        )}
        <p className="mt-4 font-mono text-xs text-fg-faint">
          {mode === "reconnecting"
            ? `Menghubungkan kembali ke room ${code}`
            : `Mengecek room ${code}`}
        </p>
        <button
          type="button"
          onClick={leaveRoom}
          className="mt-4 text-xs text-fg-muted underline underline-offset-4 transition-colors duration-150 hover:text-fg"
        >
          Kembali ke lobby
        </button>
      </div>
    </main>
  );
}
