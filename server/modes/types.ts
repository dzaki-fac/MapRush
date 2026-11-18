import type { NoticeKind } from "../../src/shared/protocol";
import type { RoomState } from "../../src/shared/types";

export type AnswerKind = "correct" | "wrong" | "duplicate" | "ignored";

export interface AnswerOutcome {
  kind: AnswerKind;
  noticeKind: NoticeKind;
  message: string;
  /** Dikirim ke semua pemain, misalnya pengumuman pemenang ronde. */
  broadcast?: { kind: NoticeKind; message: string };
  changed: boolean;
  /** Mode bisa mengakhiri game lebih awal, misalnya target Country Hunt habis. */
  finish?: boolean;
}

export interface TickResult {
  changed: boolean;
  notice?: { kind: NoticeKind; message: string };
  finish?: boolean;
}

export interface GameModeHandler {
  /** Dipanggil tepat saat status berubah menjadi playing. */
  onStart(room: RoomState): void;
  /** Dipanggil setiap detik saat game berjalan. */
  onTick?(room: RoomState, now: number): TickResult;
  /** Jawaban teks (World Conquest, Continent Rush). */
  submitGuess?(room: RoomState, playerId: string, guess: string): AnswerOutcome;
  /** Klik negara pada peta (Country Hunt). */
  submitClick?(
    room: RoomState,
    playerId: string,
    questionId: string,
    ccn3: string,
  ): AnswerOutcome;
}
