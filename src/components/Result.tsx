"use client";

import { ArrowLeft, Crosshair, RotateCcw } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { MapRule } from "@/components/MapRule";

export function Result() {
  const { room, playerId, connection, requestRematch, leaveRoom } = useGame();

  if (!room?.result) return null;

  const { result, players, usedCountries } = room;
  const isHost = playerId === room.ownerId;
  const winner = players.find((p) => p.id === result.winnerId);
  const iWon = result.winnerId === playerId;
  const myCount = usedCountries.filter((u) => u.ownerId === playerId).length;

  const counts: Record<string, number> = {};
  for (const used of usedCountries) {
    counts[used.ownerId] = (counts[used.ownerId] ?? 0) + 1;
  }

  const title = result.draw ? "Seri" : iWon ? "Kamu menang" : `${winner?.nickname ?? "Lawan"} menang`;
  const subtitle = result.draw
    ? `Kedua pemain menyebut ${counts[players[0]?.id ?? ""] ?? 0} negara.`
    : iWon
      ? `Kamu menyebut ${myCount} negara dalam pertandingan ini.`
      : `${winner?.nickname ?? "Lawan"} menyebut ${counts[winner?.id ?? ""] ?? 0} negara.`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[880px] flex-col px-4 sm:px-6">
      <AppBar status={connection} />

      <div className="flex-1 py-10 sm:py-14">
        <p className="font-mono text-xs text-accent">Hasil pertandingan</p>
        <h1 className="mt-2 text-[32px] font-medium tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>

        <Panel className="mt-8 p-6">
          <div className="divide-y divide-line border-y border-line">
            {players.map((player) => {
              const isWinner = result.winnerId === player.id;
              return (
                <div key={player.id} className="flex h-14 items-center gap-3">
                  <span className="grid w-4 shrink-0 place-items-center">
                    {isWinner ? (
                      <Crosshair
                        size={14}
                        strokeWidth={1.5}
                        className="text-accent"
                        aria-label="Pemenang"
                      />
                    ) : null}
                  </span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {player.nickname}
                    {player.id === playerId && <span className="text-fg-faint"> · kamu</span>}
                  </span>
                  <span className="font-mono text-[28px] leading-none tnum">
                    {result.scores[player.id] ?? player.score}
                  </span>
                  <span className="w-20 shrink-0 text-right font-mono text-[11px] text-fg-faint">
                    {counts[player.id] ?? 0} negara
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between py-4 text-xs text-fg-muted">
            <span>Total negara disebut</span>
            <span className="font-mono text-fg tnum">{usedCountries.length}</span>
          </div>

          <MapRule className="my-2" />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isHost ? (
              <Button size="lg" className="flex-1" onClick={requestRematch}>
                <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
                Rematch
              </Button>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-control border border-line bg-ink-850 px-4 text-sm text-fg-muted">
                Menunggu host memulai rematch
              </div>
            )}
            <Button variant="secondary" size="lg" className="flex-1" onClick={leaveRoom}>
              <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
              Kembali ke lobby
            </Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}
