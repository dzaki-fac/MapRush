"use client";

import { useState, type FormEvent } from "react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MapRule } from "@/components/MapRule";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import { GAME_DURATION_MS, PLAYER_COLORS } from "@/shared/constants";
import { getSocketUrl } from "@/lib/socketUrl";

const rules = [
  {
    title: "Buat atau gabung room",
    detail: "Bagikan kode room ke lawanmu, lalu mulai pertandingan.",
  },
  {
    title: "Sebut nama negara",
    detail: "Jawaban tidak case-sensitive; alias seperti USA dan UK diterima.",
  },
  {
    title: "Klaim wilayah",
    detail: "Negara pertama yang disebut menjadi milikmu dan tidak bisa diulang.",
  },
  {
    title: "Waktu habis",
    detail: "Skor tertinggi menang. Skor yang sama berarti seri.",
  },
];

export function Lobby() {
  const { connection, createRoom, joinRoom, notice } = useGame();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return;
    createRoom(nickname.trim());
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.trim(), nickname.trim());
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-4 sm:px-6">
      <AppBar status={connection} />

      <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:gap-16 lg:py-14">
        <section className="flex flex-col">
          <p className="font-mono text-xs text-accent">1v1 · {GAME_DURATION_MS / 1000} detik</p>
          <h1 className="mt-4 max-w-xl text-[32px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[38px]">
            Sebut negara, rebut warnamu di peta
          </h1>
          <p className="mt-4 max-w-lg text-sm text-fg-muted">
            Dua pemain, satu peta dunia. Ketik nama negara yang belum diambil sebelum
            waktu habis.
          </p>

          <MapRule className="my-8" />

          <ol className="space-y-4">
            {rules.map((rule, index) => (
              <li key={rule.title} className="flex gap-4">
                <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-fg-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-fg-muted">
                  <span className="text-fg">{rule.title}</span> — {rule.detail}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-auto pt-10">
            <Panel className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[11px] text-fg-faint">Peta dunia · Equal Earth</p>
                <div className="flex gap-4 text-[11px] text-fg-muted">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-[2px]"
                      style={{ backgroundColor: PLAYER_COLORS[0] }}
                    />
                    Pemain 1
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-[2px]"
                      style={{ backgroundColor: PLAYER_COLORS[1] }}
                    />
                    Pemain 2
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <WorldMapCanvas usedCountries={[]} players={[]} />
              </div>
            </Panel>
          </div>
        </section>

        <section className="lg:pt-1">
          <Panel className="p-6">
            <h2 className="text-base font-medium">Mulai pertandingan</h2>
            <p className="mt-1 text-xs text-fg-muted">Masukkan nickname untuk masuk ke room.</p>

            <div className="mt-6 flex gap-6 border-b border-line">
              {(["create", "join"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors duration-150 ${
                    tab === key
                      ? "border-accent text-fg"
                      : "border-transparent text-fg-muted hover:text-fg"
                  }`}
                  aria-pressed={tab === key}
                >
                  {key === "create" ? "Buat room" : "Gabung room"}
                </button>
              ))}
            </div>

            {connection === "offline" && (
              <div className="mt-5 border-l-2 border-l-signal-bad bg-ink-850 px-3 py-3">
                <p className="text-sm font-medium text-fg">
                  Tidak dapat terhubung ke server game
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                  WebSocket di <code className="break-all font-mono text-accent">{getSocketUrl()}</code>{" "}
                  belum merespons. Di Vercel, cek Function Logs untuk <code className="font-mono">/api/ws</code>{" "}
                  dan pastikan Fluid compute aktif. Jika memakai server sendiri, pastikan servernya
                  berjalan dan alamatnya <code className="font-mono">wss://</code>.
                </p>
              </div>
            )}

            {notice && (
              <div className="mt-4">
                <NoticeBanner notice={notice} />
              </div>
            )}

            {tab === "create" ? (
              <form onSubmit={handleCreate} className="mt-6 space-y-4">
                <Input
                  id="nickname-create"
                  label="Nickname"
                  placeholder="Misal: GeograferCepat"
                  autoComplete="off"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!nickname.trim() || connection === "offline"}
                >
                  Buat room
                </Button>
                <p className="text-xs text-fg-faint">Kamu menjadi host dan mendapat kode room.</p>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="mt-6 space-y-4">
                <Input
                  id="nickname-join"
                  label="Nickname"
                  placeholder="Misal: TukangPeta"
                  autoComplete="off"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <Input
                  id="room-code"
                  label="Kode room"
                  placeholder="5 karakter"
                  autoComplete="off"
                  className="font-mono uppercase tracking-[0.12em]"
                  maxLength={5}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    !nickname.trim() || !roomCode.trim() || connection === "offline"
                  }
                >
                  Gabung room
                </Button>
              </form>
            )}
          </Panel>
          <p className="mt-4 px-1 text-xs text-fg-faint">
            Tanpa akun. Cukup satu kode room untuk dua pemain.
          </p>
        </section>
      </div>

      <footer className="flex h-12 shrink-0 items-center justify-between border-t border-line text-[11px] text-fg-faint">
        <span>MapRush</span>
        <span>Peta dunia · data negara berdaulat</span>
      </footer>
    </main>
  );
}
