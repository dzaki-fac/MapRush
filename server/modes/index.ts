import type { GameType } from "../../src/shared/types";
import { continentRush } from "./continent-rush";
import { countryHunt } from "./country-hunt";
import { worldConquest } from "./world-conquest";
import type { GameModeHandler } from "./types";

export type { AnswerOutcome, GameModeHandler, TickResult } from "./types";

const handlers: Record<GameType, GameModeHandler> = {
  "world-conquest": worldConquest,
  "country-hunt": countryHunt,
  "continent-rush": continentRush,
};

export function getModeHandler(gameType: GameType): GameModeHandler {
  return handlers[gameType] ?? worldConquest;
}
