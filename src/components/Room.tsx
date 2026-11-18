"use client";

import { useState } from "react";
import { ArrowLeft, Copy, Check, Link2 } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { GAME_MODES, modeInfo } from "@/lib/game-modes";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/constants";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MapRule } from "@/components/MapRule";
import { copyText } from "@/lib/clipboard";

export function Room() {
  const {
    room,
    playerId,
    connection,
    startGame,
    setGameType,
    setMaxPlayers,
    leaveRoom,
    notice,
  } = useGame();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!room) return null;

  const roomCode = room.code;
  const isHost = room.ownerId === playerId;
  const maxPlayers = room.maxPlayers;
  const ready = room.players.length >= MIN_PLAYERS;
  const seconds = Math.round(room.durationMs / 1000);

  async function handleCopy() {
    const ok = await copyText(roomCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/room/${roomCode}`;
    const ok = await copyText(url);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[880px] flex-col px-4 sm:px-6">
      <AppBar
        status={connection}
        aside={
          <button
            type="button"
            onClick={leaveRoom}
            className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            Keluar
          </button>
        }
      />

      <div className="flex-1 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-accent">Ruang tunggu</p>
            <h1 className="mt-2 text-[28px] font-medium tracking-[-0.02em]">Room {room.code}</h1>
          </div>
          <span className="shrink-0 font-mono text-xs text-fg-faint">{seconds} detik / game</span>
        </div>

        {notice && (
          <div className="mt-6">
            <NoticeBanner notice={notice} />
          </div>
        )}

        <Panel className="mt-8 p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="field-label">Kode room</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[32px] leading-none tracking-[0.18em] tnum">
                  {room.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Salin kode room"
                  title="Salin kode room"
                  className="grid h-8 w-8 place-items-center rounded-control border border-line text-fg-muted transition-colors duration-150 hover:border-ink-700 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  {copied ? (
                    <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Copy size={15} strokeWidth={1.5} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  aria-label="Salin tautan undangan"
                  title="Salin tautan undangan"
                  className="grid h-8 w-8 place-items-center rounded-control border border-line text-fg-muted transition-colors duration-150 hover:border-ink-700 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  {linkCopied ? (
                    <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Link2 size={15} strokeWidth={1.5} aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-fg-faint">
                {linkCopied
                  ? "Tautan tersalin — kirim ke lawanmu"
                  : copied
                    ? "Kode tersalin"
                    : "Bagikan kode atau tautan ke lawanmu"}
              </p>
            </div>
            <div className="text-xs text-fg-muted sm:text-right">
              <p>{modeInfo(room.gameType).name}</p>
              <p className="mt-1 text-fg-faint">
                {modeInfo(room.gameType).duration} detik · mode bebas
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="field-label">Mode permainan</p>
            {isHost ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {GAME_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGameType(mode.id)}
                    className={`rounded-control border px-3 py-2 text-left text-[11px] transition-colors duration-150 ${
                      mode.id === room.gameType
                        ? "border-accent/60 bg-accent/5 text-fg"
                        : "border-line text-fg-muted hover:border-ink-700 hover:text-fg"
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fg">
                {modeInfo(room.gameType).name}
                <span className="ml-2 text-xs text-fg-faint">
                  {modeInfo(room.gameType).description}
                </span>
              </p>
            )}
            {isHost && (
              <p className="mt-2 text-[11px] text-fg-faint">
                Mode bisa diganti sebelum game dimulai.
              </p>
            )}
          </div>

          {room.mode !== "solo" && (
            <div className="mt-5">
              <p className="field-label">Kapasitas room</p>
              {isHost ? (
                <div className="mt-2 flex gap-2">
                  {Array.from(
                    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
                    (_, index) => MIN_PLAYERS + index,
                  ).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setMaxPlayers(count)}
                      aria-pressed={count === maxPlayers}
                      className={`h-9 w-9 rounded-control border font-mono text-xs transition-colors duration-150 ${
                        count === maxPlayers
                          ? "border-accent/60 bg-accent/5 text-fg"
                          : "border-line text-fg-muted hover:border-ink-700 hover:text-fg"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-fg">{maxPlayers} pemain</p>
              )}
              <p className="mt-2 text-[11px] text-fg-faint">
                Game mulai setelah minimal {MIN_PLAYERS} pemain bergabung.
              </p>
            </div>
          )}

          <MapRule className="my-6" />

          <p className="field-label">
            Pemain · {room.players.length}/{maxPlayers}
          </p>
          <div className="divide-y divide-line border-y border-line">
            {room.players.map((player) => (
              <div key={player.id} className="flex h-12 items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: player.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {player.nickname}
                  {player.id === playerId && (
                    <span className="text-fg-faint"> · kamu</span>
                  )}
                </span>
                {player.isHost && (
                  <span className="font-mono text-[11px] text-fg-faint">host</span>
                )}
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    player.connected ? "bg-signal-good" : "bg-ink-700"
                  }`}
                  title={player.connected ? "Terhubung" : "Terputus"}
                />
              </div>
            ))}
            {room.players.length < maxPlayers && room.mode !== "solo" && (
              <div className="flex h-12 items-center gap-3 text-fg-faint">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-line" />
                <span className="flex-1 text-sm">
                  {ready
                    ? "Bisa mulai — atau tunggu pemain lain"
                    : `Menunggu ${MIN_PLAYERS - room.players.length} pemain lagi`}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            {ready ? (
              isHost ? (
                <Button size="lg" className="w-full" onClick={startGame}>
                  Mulai game
                </Button>
              ) : (
                <div className="rounded-control border border-line bg-ink-850 px-4 py-2.5 text-center text-sm text-fg-muted">
                  Menunggu host memulai game
                </div>
              )
            ) : (
              <Button size="lg" className="w-full" disabled>
                Butuh {MIN_PLAYERS - room.players.length} pemain lagi
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}
