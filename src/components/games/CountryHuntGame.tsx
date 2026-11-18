"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Panel } from "@/components/ui/Panel";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import { MapFrame } from "@/components/games/MapFrame";
import { ScoreList } from "@/components/games/ScoreList";
import { GameFooter, NoticeOverlay, TimerLabel } from "@/components/games/GameExtras";
import type { HuntFeedback } from "@/shared/types";

export function CountryHuntGame() {
  const { room, playerId, connection, notice, submitClick } = useGame();
  const [shownFeedback, setShownFeedback] = useState<HuntFeedback | null>(null);

  const hunt = room?.hunt ?? null;
  const feedback = hunt?.feedback.find((item) => item.playerId === playerId) ?? null;

  useEffect(() => {
    if (!feedback) {
      setShownFeedback(null);
      return;
    }
    setShownFeedback(feedback);
    const timer = setTimeout(() => setShownFeedback(null), 900);
    return () => clearTimeout(timer);
  }, [feedback?.at, feedback?.ccn3, feedback?.kind]);

  if (!room) return null;

  const seconds = Math.ceil(room.remainingMs / 1000);
  const target = hunt?.target ?? null;
  const winner = room.players.find((p) => p.id === hunt?.lastWinnerId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:h-dvh lg:min-h-0">
      <AppBar
        status={connection}
        aside={<span className="font-mono text-xs text-fg-faint">room {room.code}</span>}
      />

      <div className="flex min-h-0 flex-1 flex-col pt-3 pb-4 sm:pt-4">
        <NoticeOverlay notice={notice} />

        <div className="mt-3 grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-h-0 flex-col gap-3">
            <Panel className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-fg-faint">Temukan di peta</p>
                <p
                  key={target?.questionId}
                  className="mt-1 animate-enter truncate text-[28px] font-medium tracking-[-0.02em]"
                >
                  {target?.name ?? "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[11px] text-fg-faint">
                  putaran {hunt?.round ?? 0}
                </p>
                {winner && (
                  <p key={`${winner.id}-${hunt?.round}`} className="mt-1 animate-enter text-xs text-signal-good">
                    +5 {winner.nickname}
                  </p>
                )}
              </div>
            </Panel>

            <MapFrame
              title="Peta dunia · klik negara"
              right={<TimerLabel seconds={seconds} urgent={seconds <= 15} />}
            >
              <WorldMapCanvas
                usedCountries={room.usedCountries}
                players={room.players}
                clickable
                feedback={shownFeedback}
                onCountryClick={(ccn3) => {
                  if (target) submitClick(target.questionId, ccn3);
                }}
              />
            </MapFrame>
          </div>

          <aside className="flex flex-col gap-4">
            <Panel className="shrink-0 p-4">
              <ScoreList players={room.players} playerId={playerId} />
            </Panel>

            <Panel className="shrink-0 p-5">
              <h2 className="text-sm font-medium">Cara main</h2>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-fg-muted">
                <li>
                  <span className="text-signal-good">Klik tepat</span> → +5 poin dan target
                  berganti.
                </li>
                <li>
                  <span className="text-signal-bad">Klik salah</span> → -1 poin, minimum 0.
                </li>
                <li>Siapa lebih dulu klik, dialah yang mendapat poin.</li>
              </ul>
              <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-fg-faint">
                {hunt?.usedTargets.length ?? 0} target sudah digunakan
              </p>
            </Panel>
          </aside>
        </div>
      </div>

      <GameFooter room={room} />
    </main>
  );
}
