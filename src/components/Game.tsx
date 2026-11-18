"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import type { Player } from "@/shared/types";

function ScoreCard({
  player,
  isMe,
  align = "left",
}: {
  player?: Player;
  isMe?: boolean;
  align?: "left" | "right";
}) {
  if (!player) return null;
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: player.color }}
      />
      <div className="min-w-0">
        <p className="truncate text-xs text-fg-muted">
          {player.nickname}
          {isMe && <span className="text-fg-faint"> · kamu</span>}
        </p>
        <p className="font-mono text-[10px] text-fg-faint">
          {isMe ? "pemain kamu" : "lawan"}
        </p>
      </div>
      <span className="ml-1 font-mono text-[24px] leading-none tnum sm:text-[28px]">
        {player.score}
      </span>
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

      <div className="flex min-h-0 flex-1 flex-col py-4 sm:py-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line pb-4 sm:gap-3">
          <ScoreCard player={me} isMe />
          <div className="text-center">
            <p className="font-mono text-[11px] text-fg-faint">sisa waktu</p>
            <p
              className={`mt-0.5 font-mono text-[26px] leading-none tnum sm:text-[30px] ${
                urgent ? "text-signal-bad" : "text-fg"
              }`}
            >
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </p>
          </div>
          <div className="justify-self-end">
            {opponent ? (
              <ScoreCard player={opponent} align="right" />
            ) : (
              <span className="font-mono text-[11px] text-fg-faint">mode solo</span>
            )}
          </div>
        </div>

        {/* Slot tetap supaya peta tidak ikut bergeser saat notifikasi muncul/hilang. */}
        <div className="mt-4 flex h-14 shrink-0 items-start">
          {notice && <NoticeBanner notice={notice} />}
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
              <p className="font-mono text-[11px] text-fg-faint">Peta dunia · Equal Earth</p>
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
            </div>
            <div className="grid min-h-0 flex-1 place-items-center bg-ink-950/50 p-3">
              <div className="flex h-full min-h-0 w-full items-center justify-center">
                <WorldMapCanvas
                  usedCountries={room.usedCountries}
                  players={room.players}
                />
              </div>
            </div>
          </Panel>

          <aside className="flex min-h-0 flex-col gap-4">
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

            <Panel className="flex min-h-[220px] flex-1 flex-col p-5">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-sm font-medium">Negara terpakai</h2>
                <span className="font-mono text-xs text-fg-faint tnum">
                  {room.usedCountries.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
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
    </main>
  );
}
