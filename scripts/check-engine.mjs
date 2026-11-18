import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  startGame,
  finishGame,
  rematch,
  durationForGameType,
} from "../server/gameEngine.ts";
import { getModeHandler } from "../server/modes/index.ts";

const { room, playerId } = createRoom("Alpha");
assert.equal(room.gameType, "world-conquest");
assert.equal(durationForGameType("continent-rush"), 120_000);

const p2 = joinRoom(room, "Beta");
const mode = getModeHandler("world-conquest");
startGame(room);
mode.onStart(room);

assert.equal(mode.submitGuess(room, playerId, "Indonesia").kind, "correct");
assert.equal(mode.submitGuess(room, playerId, "Japan").kind, "correct");
assert.equal(mode.submitGuess(room, p2.id, "Brazil").kind, "correct");

finishGame(room);
assert.equal(room.status, "finished");
assert.equal(room.result.winnerId, playerId);
assert.equal(room.result.scores[playerId], 2);
assert.equal(room.result.scores[p2.id], 1);

const started = rematch(room);
assert.equal(started, true);
assert.equal(room.status, "countdown");
assert.equal(room.usedCountries.length, 0);
assert.ok(room.players.every((p) => p.score === 0));

const solo = createRoom("Solo", "country-hunt");
solo.room.mode = "solo";
assert.equal(solo.room.gameType, "country-hunt");
assert.equal(rematch(solo.room), true);
assert.equal(solo.room.status, "countdown");

console.log("ENGINE TEST PASSED ✅");
