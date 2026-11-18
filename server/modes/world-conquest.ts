import { findCountry } from "../country-validator";
import type { UsedCountry } from "../../src/shared/types";
import type { AnswerOutcome, GameModeHandler } from "./types";

const ignored = (reason: string): AnswerOutcome => ({
  kind: "ignored",
  noticeKind: "info",
  message: reason,
  changed: false,
});

/** World Conquest — logika lama dipindah utuh agar tidak ada regresi. */
export const worldConquest: GameModeHandler = {
  onStart() {
    // Tidak ada state khusus; seluruh state ada di RoomState.usedCountries.
  },

  submitGuess(room, playerId, rawGuess): AnswerOutcome {
    if (room.status !== "playing") {
      return ignored("Game belum dimulai atau sudah selesai");
    }
    const player = room.players.find((item) => item.id === playerId);
    if (!player) return ignored("Pemain tidak ditemukan");

    const country = findCountry(rawGuess);
    if (!country) {
      return {
        kind: "wrong",
        noticeKind: "invalid",
        message: "Negara tidak valid",
        changed: false,
      };
    }
    if (room.usedCountries.some((item) => item.ccn3 === country.ccn3)) {
      return {
        kind: "duplicate",
        noticeKind: "duplicate",
        message: "Negara sudah dipakai",
        changed: false,
      };
    }

    const used: UsedCountry = {
      ccn3: country.ccn3,
      name: country.name,
      ownerId: playerId,
      ownerNickname: player.nickname,
      at: Date.now(),
    };
    room.usedCountries.push(used);
    player.score += 1;

    return {
      kind: "correct",
      noticeKind: "correct",
      message: `Benar! +1 — ${country.name}`,
      changed: true,
    };
  },
};
