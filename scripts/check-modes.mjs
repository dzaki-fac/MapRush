import assert from "node:assert/strict";
import {
  computeResult,
  createRoom,
  finishGame,
  joinRoom,
  rematch,
  startGame,
} from "../server/gameEngine.ts";
import { getModeHandler } from "../server/modes/index.ts";
import { countriesWithContinent } from "../server/country-validator.ts";

function playingRoom(gameType) {
  const { room } = createRoom("Alpha", gameType);
  const p2 = joinRoom(room, "Beta");
  const mode = getModeHandler(gameType);
  startGame(room);
  mode.onStart(room);
  return { room, p1: room.players[0].id, p2: p2.id, mode };
}

function correctClick(room, mode, playerId) {
  const target = room.hunt.target;
  assert.ok(target, "target harus tersedia");
  return mode.submitClick(room, playerId, target.questionId, target.ccn3);
}

// --- World Conquest regression ---
{
  const { room, p1, mode } = playingRoom("world-conquest");
  const first = mode.submitGuess(room, p1, "indonesia");
  assert.equal(first.kind, "correct");
  assert.equal(room.players[0].score, 1);
  assert.equal(mode.submitGuess(room, p1, "INDONESIA").kind, "duplicate");
  assert.equal(mode.submitGuess(room, p1, "kerajaan pizza").kind, "wrong");
  assert.equal(room.players[0].score, 1);
  console.log("world-conquest regression OK");
}

// --- Country Hunt: +5 / -1 / minimum 0 ---
{
  const { room, p1, mode } = playingRoom("country-hunt");
  assert.equal(correctClick(room, mode, p1).kind, "correct");
  assert.equal(room.players[0].score, 5);

  for (let i = 0; i < 8; i += 1) {
    const target = room.hunt.target;
    const wrong = target.ccn3 === "004" ? "008" : "004";
    const outcome = mode.submitClick(room, p1, target.questionId, wrong);
    assert.equal(outcome.kind, "wrong");
    assert.ok(room.players[0].score >= 0, "skor tidak boleh negatif");
  }
  assert.equal(room.players[0].score, 0);
  console.log("country-hunt scoring OK (min 0)");
}

// --- Country Hunt: hanya jawaban benar pertama yang diproses ---
{
  const { room, p1, p2, mode } = playingRoom("country-hunt");
  const target = room.hunt.target;
  const first = mode.submitClick(room, p1, target.questionId, target.ccn3);
  assert.equal(first.kind, "correct");
  const stale = mode.submitClick(room, p2, target.questionId, target.ccn3);
  assert.equal(stale.kind, "ignored", "jawaban untuk questionId lama harus diabaikan");
  assert.equal(room.players.find((p) => p.id === p2).score, 0);
  assert.equal(room.usedCountries.length, 1, "target yang benar jadi milik pemain");
  assert.equal(room.usedCountries[0].ownerId, p1);
  console.log("country-hunt first-answer-wins & claim OK");
}

// --- Country Hunt: target berganti setelah 5 detik ---
{
  const { room, mode } = playingRoom("country-hunt");
  const previous = room.hunt.target.questionId;
  assert.equal(room.hunt.targetRemainingMs, 5000);
  room.hunt.targetEndsAt = Date.now() - 1;
  const tick = mode.onTick(room, Date.now());
  assert.equal(tick.changed, true);
  assert.notEqual(room.hunt.target.questionId, previous);
  assert.equal(room.hunt.targetRemainingMs, 5000);
  console.log("country-hunt 5s rotation OK");
}

// --- Country Hunt: target tidak diulang ---
{
  const { room, p1, mode } = playingRoom("country-hunt");
  const seen = new Set();
  for (let i = 0; i < 20; i += 1) {
    const target = room.hunt.target;
    if (!target) break;
    assert.ok(!seen.has(target.ccn3), `target ${target.ccn3} terulang`);
    seen.add(target.ccn3);
    correctClick(room, mode, p1);
  }
  assert.ok(seen.size >= 20 || !room.hunt.target);
  console.log(`country-hunt no-repeat OK (${seen.size} target)`);
}

// --- Continent Rush: validasi benua & klaim sekali ---
{
  const { room, p1, p2, mode } = playingRoom("continent-rush");
  const active = room.rush.active;
  const inContinent = countriesWithContinent().find(
    (item) => item.continent === active,
  );
  const other = countriesWithContinent().find(
    (item) => item.continent !== active,
  );

  assert.equal(mode.submitGuess(room, p1, other.country.name).kind, "wrong");
  assert.equal(
    mode.submitGuess(room, p1, other.country.name).noticeKind,
    "wrong-continent",
  );
  assert.equal(mode.submitGuess(room, p1, "kerajaan pizza").kind, "wrong");

  const correct = mode.submitGuess(room, p1, inContinent.country.name);
  assert.equal(correct.kind, "correct");
  assert.equal(room.players[0].score, 1);
  assert.equal(mode.submitGuess(room, p2, inContinent.country.name).kind, "duplicate");
  assert.equal(room.players.find((p) => p.id === p2).score, 0);
  console.log("continent-rush validation OK");
}

// --- Continent Rush: pergantian benua mengikuti timer ---
{
  const { room, mode } = playingRoom("continent-rush");
  const first = room.rush.active;
  const firstRound = room.rush.round;
  room.rush.nextAt = Date.now() - 1;
  const tick = mode.onTick(room, Date.now());
  assert.equal(tick.changed, true);
  assert.notEqual(room.rush.active, first);
  assert.equal(room.rush.round, firstRound + 1);
  assert.ok(room.rush.nextAt > Date.now());
  console.log("continent-rush rotation OK");
}

// --- Timer habis & pemenang ---
{
  const { room, p1 } = playingRoom("world-conquest");
  room.players[0].score = 7;
  room.players[1].score = 3;
  finishGame(room);
  assert.equal(room.endsAt, null);
  assert.equal(room.remainingMs, 0);
  const result = computeResult(room);
  assert.equal(result.winnerId, p1);
  assert.equal(result.draw, false);

  const three = createRoom("A").room;
  const second = joinRoom(three, "B");
  const third = joinRoom(three, "C");
  three.players[0].score = 4;
  second.score = 9;
  third.score = 2;
  const threeResult = computeResult(three);
  assert.equal(threeResult.winnerId, second.id);
  assert.equal(threeResult.draw, false);

  const drawRoom = createRoom("A").room;
  joinRoom(drawRoom, "B");
  assert.equal(computeResult(drawRoom).draw, true);
  console.log("finish & winner calculation OK (2 & 3 pemain)");
}

// --- Rematch memakai mode yang sama ---
{
  const { room } = playingRoom("continent-rush");
  assert.equal(rematch(room), true);
  assert.equal(room.status, "countdown");
  assert.equal(room.gameType, "continent-rush");
  console.log("rematch keeps mode OK");
}

console.log("ALL MODE TESTS PASSED ✅");
