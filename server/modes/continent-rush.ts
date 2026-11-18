import { continentOfCode, findCountry } from "../country-validator";
import { CONTINENTS } from "../../src/data/continent-codes";
import { CONTINENT_INTERVAL_MS } from "../../src/shared/constants";
import type { Continent, UsedCountry } from "../../src/shared/types";
import type {
  AnswerOutcome,
  GameModeHandler,
  TickResult,
} from "./types";

const ignored = (reason: string): AnswerOutcome => ({
  kind: "ignored",
  noticeKind: "info",
  message: reason,
  changed: false,
});

function shuffled(): Continent[] {
  const result = [...CONTINENTS];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Continent Rush — +1 per negara dari benua aktif; benua berganti tiap 20 detik. */
export const continentRush: GameModeHandler = {
  onStart(room) {
    const order = shuffled();
    room.rush = {
      order,
      index: 0,
      active: order[0],
      nextAt: Date.now() + CONTINENT_INTERVAL_MS,
      remainingMs: CONTINENT_INTERVAL_MS,
      round: 1,
    };
  },

  onTick(room, now): TickResult {
    const rush = room.rush;
    if (!rush || room.status !== "playing" || !rush.nextAt) {
      return { changed: false };
    }

    const remaining = Math.max(0, rush.nextAt - now);
    rush.remainingMs = remaining;
    if (remaining > 0) return { changed: false };

    rush.index = (rush.index + 1) % rush.order.length;
    rush.active = rush.order[rush.index];
    rush.round += 1;
    rush.nextAt += CONTINENT_INTERVAL_MS;
    if (rush.nextAt <= now) rush.nextAt = now + CONTINENT_INTERVAL_MS;
    rush.remainingMs = rush.nextAt - now;

    return {
      changed: true,
      notice: {
        kind: "continent",
        message: `Benua berikutnya: ${rush.active}`,
      },
    };
  },

  submitGuess(room, playerId, rawGuess): AnswerOutcome {
    if (room.status !== "playing" || !room.rush?.active) {
      return ignored("Game belum dimulai atau sudah selesai");
    }
    const player = room.players.find((item) => item.id === playerId);
    if (!player) return ignored("Pemain tidak ditemukan");

    const country = findCountry(rawGuess);
    if (!country) {
      return {
        kind: "wrong",
        noticeKind: "invalid",
        message: "Country not found",
        changed: false,
      };
    }
    if (room.usedCountries.some((item) => item.ccn3 === country.ccn3)) {
      return {
        kind: "duplicate",
        noticeKind: "duplicate",
        message: "Country already claimed",
        changed: false,
      };
    }
    if (continentOfCode(country.ccn3) !== room.rush.active) {
      return {
        kind: "wrong",
        noticeKind: "wrong-continent",
        message: "Wrong continent",
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
      message: "Correct! +1",
      changed: true,
    };
  },
};
