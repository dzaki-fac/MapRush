"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import type { Player } from "@/shared/types";

function ScoreCard({ player, isMe }: { player?: Player; isMe?: boolean }) {
  if (!player) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: player.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-fg-muted">
          {player.nickname}
          {isMe && <span className="text-fg-faint"> · kamu</span>}
        </p>
        <p className="font-mono text-[10px] text-fg-faint">
          {isMe ? "pemain kamu" : "lawan"}
        </p>
      </div>
      <span className="font-mono text-[24px] leading-none tnum">{player.score}</span>
    </div>
  );
}

export function Game() {
  const { room, playerId, connection, submitGuess, notice } = useGame();
  const [guess, setGuess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const seconds = Math.ceil(room.remainingMs / 1000);
  const urgent = seconds <= 15;
  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = guess.trim();
    if (!value) return;
    submitGuess(value);
    setGuess("");
    inputRef.current?.focus();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:h-dvh lg:min-h-0">
      <AppBar
        status={connection}
        aside={<span className="font-mono text-xs text-fg-faint">room {room.code}</span>}
      />

      <div className="flex min-h-0 flex-1 flex-col pt-3 pb-4 sm:pt-4">
        {/* Notifikasi melayang: tidak menyisakan ruang kosong di atas peta. */}
        <div className="relative z-10 mt-3 h-0 shrink-0">
          {notice && (
            <div className="absolute inset-x-0 top-0">
              <NoticeBanner notice={notice} />
            </div>
          )}
        </div>

        <div className="mt-3 grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
              <p className="font-mono text-[11px] text-fg-faint">Peta dunia · Equal Earth</p>
              <div className="flex items-center gap-4">
                <div className="flex gap-4 text-[11px] text-fg-muted">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-[2px]"
                      style={{ backgroundColor: me?.color }}
                    />
                    Kamu
                  </span>
                  {opponent && (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ backgroundColor: opponent.color }}
                      />
                      Lawan
                    </span>
                  )}
                </div>
                <span className="h-4 w-px bg-line" aria-hidden="true" />
                <span
                  className={`font-mono text-[15px] leading-none tnum ${
                    urgent ? "text-signal-bad" : "text-fg"
                  }`}
                  title="Sisa waktu"
                >
                  {timeLabel}
                </span>
              </div>
            </div>
            <div className="grid place-items-center bg-ink-950/50 p-2">
              <div className="w-full">
                <WorldMapCanvas
                  usedCountries={room.usedCountries}
                  players={room.players}
                />
              </div>
            </div>
          </Panel>

          <aside className="flex flex-col gap-4">
            <Panel className="shrink-0 p-4">
              <div className="space-y-3">
                <ScoreCard player={me} isMe />
                {opponent ? (
                  <ScoreCard player={opponent} />
                ) : (
                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <span className="text-xs text-fg-muted">Mode</span>
                    <span className="font-mono text-[11px] text-fg-faint">solo</span>
                  </div>
                )}
              </div>
            </Panel>

            <Panel className="shrink-0 p-5">
              <form onSubmit={handleSubmit}>
                <label className="field-label" htmlFor="guess">
                  Nama negara
                </label>
                <div className="flex gap-2">
                  <input
                    id="guess"
                    ref={inputRef}
                    className="field min-w-0 flex-1"
                    placeholder="Misal: Indonesia"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                  />
                  <Button type="submit" disabled={!guess.trim()}>
                    Kirim
                  </Button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
                  Tidak case-sensitive · USA dan UK diterima · jawab kapan saja.
                </p>
              </form>
            </Panel>

            <Panel className="flex flex-col p-5">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-sm font-medium">Negara terpakai</h2>
                <span className="font-mono text-xs text-fg-faint tnum">
                  {room.usedCountries.length}
                </span>
              </div>
              <div className="max-h-[380px] overflow-y-auto border-t border-line">
                {room.usedCountries.length === 0 ? (
                  <p className="py-10 text-center text-xs text-fg-faint">
                    Belum ada negara yang disebut.
                  </p>
                ) : (
                  <ol className="divide-y divide-line">
                    {[...room.usedCountries].reverse().map((used, index) => {
                      const owner = room.players.find((p) => p.id === used.ownerId);
                      return (
                        <li key={used.ccn3} className="flex items-center gap-3 py-2.5 text-sm">
                          <span className="w-6 shrink-0 font-mono text-[11px] text-fg-faint">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: owner?.color }}
                          />
                          <span className="min-w-0 flex-1 truncate">{used.name}</span>
                          <span className="max-w-[88px] truncate text-[11px] text-fg-faint">
                            {owner?.nickname ?? "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-line text-[11px] text-fg-faint">
        <span>MapRush</span>
        <span>
          room {room.code} · {room.mode === "solo" ? "solo" : "1v1"} ·{" "}
          {room.durationMs / 1000} detik
        </span>
      </footer>
    </main>
  );
}
