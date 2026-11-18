"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import { MapFrame } from "@/components/games/MapFrame";
import { ScoreList } from "@/components/games/ScoreList";
import { GameFooter, NoticeOverlay, TimerLabel } from "@/components/games/GameExtras";

export function WorldConquestGame() {
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
        <NoticeOverlay notice={notice} />

        <div className="mt-3 grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <MapFrame
            title="Peta dunia · Equal Earth"
            right={<TimerLabel seconds={seconds} urgent={seconds <= 15} />}
          >
            <WorldMapCanvas usedCountries={room.usedCountries} players={room.players} />
          </MapFrame>

          <aside className="flex flex-col gap-4">
            <Panel className="shrink-0 p-4">
              <ScoreList me={me} opponent={opponent} />
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

      <GameFooter room={room} />
    </main>
  );
}
