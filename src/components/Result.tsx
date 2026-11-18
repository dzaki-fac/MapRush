"use client";

import { ArrowLeft, Crosshair, RotateCcw } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MapRule } from "@/components/MapRule";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import { modeInfo } from "@/lib/game-modes";
import type { Player } from "@/shared/types";

function FinalScore({
  player,
  isWinner,
  isMe,
}: {
  player: Player;
  isWinner: boolean;
  isMe?: boolean;
}) {
  return (
    <div
      className={`flex h-14 items-center gap-3 ${
        isWinner ? "text-fg" : "text-fg-muted"
      }`}
    >
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
        {isMe && <span className="text-fg-faint"> · kamu</span>}
      </span>
      <span className="font-mono text-[28px] leading-none tnum">
        {player.score}
      </span>
      <span className="w-16 shrink-0 text-right font-mono text-[11px] text-fg-faint">
        {isWinner ? "menang" : ""}
      </span>
    </div>
  );
}

export function Result() {
  const { room, playerId, connection, notice, requestRematch, leaveRoom } = useGame();

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

  const isSolo = room.mode === "solo";
  const title = isSolo
    ? "Selesai"
    : result.draw
      ? "Seri"
      : iWon
        ? "Kamu menang"
        : `${winner?.nickname ?? "Lawan"} menang`;
  const subtitle = isSolo
    ? `Kamu menyebut ${myCount} negara dalam ${room.durationMs / 1000} detik.`
    : result.draw
      ? `Kedua pemain menyebut ${counts[players[0]?.id ?? ""] ?? 0} negara.`
      : iWon
        ? `Kamu menyebut ${myCount} negara dalam pertandingan ini.`
        : `${winner?.nickname ?? "Lawan"} menyebut ${counts[winner?.id ?? ""] ?? 0} negara.`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:h-dvh lg:min-h-0">
      <AppBar
        status={connection}
        aside={<span className="font-mono text-xs text-fg-faint">room {room.code}</span>}
      />

      <div className="flex min-h-0 flex-1 flex-col pt-3 pb-4 sm:pt-4">
        {notice && (
          <div className="mb-3 shrink-0">
            <NoticeBanner notice={notice} />
          </div>
        )}

        <div className="mt-3 grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
              <p className="font-mono text-[11px] text-fg-faint">Peta hasil · Mercator</p>
              <p className="font-mono text-[11px] text-fg-faint tnum">
                {usedCountries.length} negara diklaim
              </p>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center bg-ink-950/50 p-2">
              <div className="flex h-full min-h-0 w-full items-center justify-center">
                <WorldMapCanvas usedCountries={usedCountries} players={players} />
              </div>
            </div>
          </Panel>

          <aside className="flex flex-col gap-4">
            <Panel className="p-5">
              <p className="font-mono text-xs text-accent">Hasil pertandingan</p>
              <h1 className="mt-2 text-[28px] font-medium tracking-[-0.02em]">{title}</h1>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">{subtitle}</p>

              <div className="mt-5 divide-y divide-line border-y border-line">
                {players.map((player) => (
                  <FinalScore
                    key={player.id}
                    player={{ ...player, score: result.scores[player.id] ?? player.score }}
                    isWinner={!isSolo && result.winnerId === player.id}
                    isMe={player.id === playerId}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between py-4 text-xs text-fg-muted">
                <span>Total negara disebut</span>
                <span className="font-mono text-fg tnum">{usedCountries.length}</span>
              </div>

              <MapRule className="my-2" />

              <div className="mt-5 flex flex-col gap-3">
                {isHost ? (
                  <Button size="lg" className="w-full" onClick={requestRematch}>
                    <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
                    Rematch
                  </Button>
                ) : (
                  <div className="rounded-control border border-line bg-ink-850 px-4 py-2.5 text-center text-sm text-fg-muted">
                    Menunggu host memulai rematch
                  </div>
                )}
                <Button variant="secondary" size="lg" className="w-full" onClick={leaveRoom}>
                  <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
                  Kembali ke lobby
                </Button>
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-line text-[11px] text-fg-faint">
        <span>MapRush</span>
        <span>
          {modeInfo(room.gameType).name} · {room.players.length} pemain ·{" "}
          {room.durationMs / 1000} detik
        </span>
      </footer>
    </main>
  );
}
