"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Globe2 } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import { MapFrame } from "@/components/games/MapFrame";
import { ScoreList } from "@/components/games/ScoreList";
import { GameFooter, NoticeOverlay, TimerLabel } from "@/components/games/GameExtras";

export function ContinentRushGame() {
  const { room, playerId, connection, notice, submitGuess } = useGame();
  const [guess, setGuess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!room) return null;

  const seconds = Math.ceil(room.remainingMs / 1000);
  const rush = room.rush;
  const nextIn = Math.ceil((rush?.remainingMs ?? 0) / 1000);

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
          <div className="flex min-h-0 flex-col gap-3">
            <Panel
              key={rush?.round}
              className="flex shrink-0 animate-enter items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-line text-accent">
                  <Globe2 size={17} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-fg-faint">Benua aktif</p>
                  <p className="mt-0.5 truncate text-[28px] font-medium tracking-[-0.02em]">
                    {rush?.active ?? "—"}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[11px] text-fg-faint">
                  berikutnya {rush?.round ? String((rush.round % 6) + 1) : "—"}/6
                </p>
                <p className={`mt-1 font-mono text-sm tnum ${nextIn <= 3 ? "text-signal-warn" : "text-fg-muted"}`}>
                  {nextIn <= 3 ? `Next continent in ${nextIn}` : `${nextIn} dtk`}
                </p>
              </div>
            </Panel>

            <MapFrame
              title="Peta dunia · benua aktif"
              right={<TimerLabel seconds={seconds} urgent={seconds <= 15} />}
            >
              <WorldMapCanvas
                usedCountries={room.usedCountries}
                players={room.players}
                activeContinent={rush?.active ?? null}
              />
            </MapFrame>
          </div>

          <aside className="flex flex-col gap-4">
            <Panel className="shrink-0 p-4">
              <ScoreList players={room.players} playerId={playerId} />
            </Panel>

            <Panel className="shrink-0 p-5">
              <form onSubmit={handleSubmit}>
                <label className="field-label" htmlFor="rush-guess">
                  Nama negara dari {rush?.active ?? "benua aktif"}
                </label>
                <div className="flex gap-2">
                  <input
                    id="rush-guess"
                    ref={inputRef}
                    className="field min-w-0 flex-1"
                    placeholder="Misal: Nigeria"
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
                  Tekan Enter untuk kirim · input langsung kosong dan tetap fokus.
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
              <div className="max-h-[320px] overflow-y-auto border-t border-line">
                {room.usedCountries.length === 0 ? (
                  <p className="py-8 text-center text-xs text-fg-faint">
                    Belum ada negara yang disebut.
                  </p>
                ) : (
                  <ol className="divide-y divide-line">
                    {[...room.usedCountries].reverse().map((used) => {
                      const owner = room.players.find((p) => p.id === used.ownerId);
                      return (
                        <li key={used.ccn3} className="flex items-center gap-2 py-2 text-sm">
                          <span
                            className="h-2 w-2 rounded-[2px]"
                            style={{ backgroundColor: owner?.color }}
                          />
                          <span className="min-w-0 flex-1 truncate">{used.name}</span>
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
