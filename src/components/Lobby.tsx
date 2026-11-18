"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Crosshair, Globe2, MapPin, Compass } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MapRule } from "@/components/MapRule";
import { WorldMapCanvas } from "@/components/WorldMapCanvas";
import { PLAYER_COLORS } from "@/shared/constants";
import { GAME_MODES, modeInfo } from "@/lib/game-modes";
import { getSocketUrl } from "@/lib/socketUrl";
import { getSavedNickname, saveNickname } from "@/lib/nicknameCookie";
import type { GameType } from "@/shared/types";

const modeIcons = {
  "world-conquest": Globe2,
  "country-hunt": MapPin,
  "continent-rush": Compass,
};

export function Lobby() {
  const { connection, createRoom, createSolo, joinRoom, notice } = useGame();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [tab, setTab] = useState<"create" | "join" | "solo">("create");
  const [gameType, setGameType] = useState<GameType>("world-conquest");

  useEffect(() => {
    setNickname(getSavedNickname());
  }, []);

  const selected = modeInfo(gameType);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return;
    saveNickname(nickname.trim());
    createRoom(nickname.trim(), gameType);
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim() || !roomCode.trim()) return;
    saveNickname(nickname.trim());
    joinRoom(roomCode.trim(), nickname.trim());
  }

  function handleSolo(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return;
    saveNickname(nickname.trim());
    createSolo(nickname.trim(), gameType);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-4 sm:px-6">
      <AppBar status={connection} />

      <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:gap-16 lg:py-14">
        <section className="flex flex-col">
          <p className="font-mono text-xs text-accent">
            1v1 · {selected.duration} detik
          </p>
          <h1 className="mt-4 max-w-xl text-[32px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[38px]">
            Sebut negara, rebut warnamu di peta
          </h1>
          <p className="mt-4 max-w-lg text-sm text-fg-muted">
            Tiga cara bermain dengan satu peta dunia yang sama. Pilih mode, undang
            teman, lalu buktikan siapa yang paling cepat.
          </p>

          <MapRule className="my-8" />

          <ol className="space-y-4">
            {[
              "Pilih mode lalu buat room atau main solo",
              "Kedua pemain melihat pertanyaan dan timer yang sama",
              "Server yang menentukan skor dan pemenang",
            ].map((text, index) => (
              <li key={text} className="flex gap-4">
                <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-fg-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-fg-muted">{text}</p>
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
            <p className="mt-1 text-xs text-fg-muted">
              Nickname tersimpan di browser, tidak perlu diketik ulang.
            </p>

            <p className="field-label mt-6">Pilih mode</p>
            <div className="mt-2 space-y-2" role="radiogroup" aria-label="Mode permainan">
              {GAME_MODES.map((mode) => {
                const Icon = modeIcons[mode.id];
                const active = mode.id === gameType;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setGameType(mode.id)}
                    className={`flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-150 ${
                      active
                        ? "border-accent/60 bg-accent/5"
                        : "border-line hover:border-ink-700 hover:bg-ink-850/60"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-control border ${
                        active ? "border-accent/40 text-accent" : "border-line text-fg-muted"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">{mode.name}</span>
                      <span className="block truncate text-[11px] text-fg-faint">
                        {mode.description}
                      </span>
                    </span>
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                        active ? "border-accent" : "border-line"
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 flex items-center gap-2 text-[11px] text-fg-muted">
              <Crosshair size={12} strokeWidth={1.5} aria-hidden="true" />
              {selected.detail}
            </p>

            <div className="mt-6 flex gap-5 border-b border-line">
              {(["create", "join", "solo"] as const).map((key) => (
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
                  {key === "create" ? "Buat room" : key === "join" ? "Gabung room" : "Solo"}
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
                  belum merespons. Cek Function Logs di Vercel dan pastikan Fluid compute aktif.
                </p>
              </div>
            )}

            {notice && (
              <div className="mt-4">
                <NoticeBanner notice={notice} />
              </div>
            )}

            {tab === "join" ? (
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
                  disabled={!nickname.trim() || !roomCode.trim() || connection === "offline"}
                >
                  Gabung room
                </Button>
              </form>
            ) : (
              <form
                onSubmit={tab === "create" ? handleCreate : handleSolo}
                className="mt-6 space-y-4"
              >
                <Input
                  id={`nickname-${tab}`}
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
                  {tab === "create" ? "Buat room" : "Mulai solo"}
                </Button>
                <p className="text-xs text-fg-faint">
                  {tab === "create"
                    ? "Kamu menjadi host dan mendapat kode room."
                    : "Satu pemain, tanpa lawan. Jawaban tetap diverifikasi server."}
                </p>
              </form>
            )}
          </Panel>
          <p className="mt-4 px-1 text-xs text-fg-faint">
            Tanpa akun. Main solo atau undang teman dengan kode room.
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
