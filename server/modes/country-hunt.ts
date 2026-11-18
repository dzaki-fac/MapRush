import { randomUUID } from "node:crypto";
import { randomClickableCountry } from "../country-validator";
import { HUNT_CORRECT_POINTS, HUNT_WRONG_POINTS } from "../../src/shared/constants";
import type { RoomState } from "../../src/shared/types";
import type { AnswerOutcome, GameModeHandler } from "./types";

const ignored = (reason: string): AnswerOutcome => ({
  kind: "ignored",
  noticeKind: "info",
  message: reason,
  changed: false,
});

function pickNext(room: RoomState): boolean {
  if (!room.hunt) return false;
  const country = randomClickableCountry(new Set(room.hunt.usedTargets));
  if (!country) {
    room.hunt.target = null;
    return false;
  }
  room.hunt.target = {
    questionId: randomUUID(),
    ccn3: country.ccn3,
    name: country.name,
  };
  room.hunt.usedTargets.push(country.ccn3);
  room.hunt.round += 1;
  room.hunt.lastWinnerId = null;
  return true;
}

function addFeedback(
  room: RoomState,
  playerId: string,
  ccn3: string,
  kind: "correct" | "wrong",
) {
  if (!room.hunt) return;
  room.hunt.feedback.push({ playerId, ccn3, kind, at: Date.now() });
  room.hunt.feedback = room.hunt.feedback.slice(-8);
}

/** Country Hunt — klik lokasi target, +5 benar / -1 salah (minimum 0). */
export const countryHunt: GameModeHandler = {
  onStart(room) {
    room.hunt = {
      target: null,
      usedTargets: [],
      feedback: [],
      lastWinnerId: null,
      round: 0,
    };
    pickNext(room);
  },

  submitClick(room, playerId, questionId, ccn3): AnswerOutcome {
    if (room.status !== "playing" || !room.hunt?.target) {
      return ignored("Game belum dimulai atau sudah selesai");
    }
    // Jawaban untuk pertanyaan lama diabaikan (race condition).
    if (questionId !== room.hunt.target.questionId) {
      return ignored("Pertanyaan sudah berganti");
    }
    const player = room.players.find((item) => item.id === playerId);
    if (!player) return ignored("Pemain tidak ditemukan");

    const target = room.hunt.target;
    if (ccn3 !== target.ccn3) {
      player.score = Math.max(0, player.score - HUNT_WRONG_POINTS);
      addFeedback(room, playerId, ccn3, "wrong");
      return {
        kind: "wrong",
        noticeKind: "invalid",
        message: `Salah! -${HUNT_WRONG_POINTS}`,
        changed: true,
      };
    }

    player.score += HUNT_CORRECT_POINTS;
    addFeedback(room, playerId, ccn3, "correct");
    room.hunt.lastWinnerId = playerId;

    const hasNext = pickNext(room);
    const hasRival = room.players.length > 1;

    return {
      kind: "correct",
      noticeKind: "correct",
      message: `Benar! +${HUNT_CORRECT_POINTS} — ${target.name}`,
      broadcast: hasRival
        ? { kind: "info", message: `${player.nickname} lebih dulu!` }
        : undefined,
      changed: true,
      finish: !hasNext,
    };
  },
};
