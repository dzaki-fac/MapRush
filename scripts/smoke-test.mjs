import assert from "node:assert/strict";
import WebSocket from "ws";
import { countriesWithContinent } from "../server/country-validator.ts";

const URL = process.env.WS_URL ?? "ws://localhost:8080";

function client() {
  const ws = new WebSocket(URL);
  const state = { ws, id: null, code: null, room: null, notices: [] };
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "JOINED") {
      state.id = msg.playerId;
      state.code = msg.roomCode;
      state.room = msg.room;
    }
    if (msg.type === "STATE") state.room = msg.room;
    if (msg.type === "NOTICE") state.notices.push(msg);
  });
  return state;
}

const send = (state, message) => state.ws.send(JSON.stringify(message));

function waitFor(predicate, label, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeout) return reject(new Error(`Timeout: ${label}`));
      setTimeout(check, 25);
    };
    check();
  });
}

async function duel(gameType = "world-conquest") {
  const a = client();
  const b = client();
  await Promise.all([
    waitFor(() => a.ws.readyState === WebSocket.OPEN, "A open"),
    waitFor(() => b.ws.readyState === WebSocket.OPEN, "B open"),
  ]);

  send(a, { type: "CREATE_ROOM", nickname: "Alpha", gameType });
  await waitFor(() => a.code, "room created");
  send(b, { type: "JOIN_ROOM", roomCode: a.code, nickname: "Beta" });
  await waitFor(() => a.room?.players.length === 2, "B joined");
  send(a, { type: "START_GAME", roomCode: a.code, playerId: a.id });
  await waitFor(() => a.room?.status === "countdown", "countdown");
  await waitFor(() => a.room?.status === "playing", "playing");
  return { a, b };
}

// --- World Conquest ---
{
  const { a, b } = await duel("world-conquest");
  send(a, { type: "SUBMIT_GUESS", roomCode: a.code, playerId: a.id, guess: "indonesia" });
  await waitFor(() => a.notices.length >= 1, "guess notice");
  assert.equal(a.notices.at(-1).kind, "correct");
  await waitFor(() => b.room?.usedCountries.length === 1, "B sees country");
  send(b, { type: "SUBMIT_GUESS", roomCode: b.code, playerId: b.id, guess: "INDONESIA" });
  await waitFor(() => b.notices.length >= 1, "duplicate notice");
  assert.equal(b.notices.at(-1).kind, "duplicate");
  assert.equal(a.room.players[0].score, 1);
  console.log("world-conquest smoke OK");
  a.ws.close();
  b.ws.close();
}

// --- Country Hunt ---
{
  const { a, b } = await duel("country-hunt");
  const target = a.room.hunt?.target;
  assert.ok(target, "target harus dikirim ke client");
  assert.deepEqual(b.room.hunt?.target, target, "kedua pemain dapat target sama");
  send(a, {
    type: "SUBMIT_CLICK",
    roomCode: a.code,
    playerId: a.id,
    questionId: target.questionId,
    ccn3: target.ccn3,
  });
  await waitFor(() => a.room.players[0].score === 5, "+5 diterima");
  assert.notEqual(a.room.hunt.target.questionId, target.questionId, "target berganti");
  send(b, {
    type: "SUBMIT_CLICK",
    roomCode: b.code,
    playerId: b.id,
    questionId: target.questionId,
    ccn3: target.ccn3,
  });
  await waitFor(() => b.notices.length >= 1, "stale answer notice");
  assert.equal(b.notices.at(-1).kind, "info");
  console.log("country-hunt smoke OK");
  a.ws.close();
  b.ws.close();
}

// --- Continent Rush ---
{
  const { a, b } = await duel("continent-rush");
  const active = a.room.rush?.active;
  assert.equal(b.room.rush?.active, active, "benua aktif sama untuk semua");
  const candidate = countriesWithContinent().find(
    (item) => item.continent === active,
  );
  assert.ok(candidate, "ada negara untuk benua aktif");
  send(a, {
    type: "SUBMIT_GUESS",
    roomCode: a.code,
    playerId: a.id,
    guess: candidate.country.name,
  });
  await waitFor(() => a.room.players[0].score === 1, "+1 diterima");
  assert.equal(a.notices.at(-1).message, "Correct! +1");
  console.log("continent-rush smoke OK");
  a.ws.close();
  b.ws.close();
}

// --- Multiplayer lebih dari 2 pemain ---
{
  const a = client();
  const b = client();
  const c = client();
  await Promise.all([
    waitFor(() => a.ws.readyState === WebSocket.OPEN, "A open"),
    waitFor(() => b.ws.readyState === WebSocket.OPEN, "B open"),
    waitFor(() => c.ws.readyState === WebSocket.OPEN, "C open"),
  ]);

  send(a, { type: "CREATE_ROOM", nickname: "Host", gameType: "world-conquest" });
  await waitFor(() => a.code, "room created");
  send(a, {
    type: "SET_MAX_PLAYERS",
    roomCode: a.code,
    playerId: a.id,
    maxPlayers: 4,
  });
  send(b, { type: "JOIN_ROOM", roomCode: a.code, nickname: "P2" });
  send(c, { type: "JOIN_ROOM", roomCode: a.code, nickname: "P3" });
  await waitFor(() => a.room?.players.length === 3, "3 pemain bergabung");
  assert.equal(a.room.maxPlayers, 4);
  assert.equal(new Set(a.room.players.map((p) => p.color)).size, 3);

  send(a, { type: "START_GAME", roomCode: a.code, playerId: a.id });
  await waitFor(() => a.room?.status === "playing", "playing");
  send(b, {
    type: "SUBMIT_GUESS",
    roomCode: b.code,
    playerId: b.id,
    guess: "Indonesia",
  });
  await waitFor(() => a.room?.usedCountries.length === 1, "state tersebar ke semua");
  assert.equal(b.room.players.length, 3);
  assert.equal(c.room.players.length, 3);
  assert.equal(c.room.players.find((p) => p.id === b.id).score, 1);
  console.log("3-player multiplayer smoke OK");
  a.ws.close();
  b.ws.close();
  c.ws.close();
}

console.log("MULTIPLAYER SMOKE TEST PASSED ✅");
process.exit(0);
