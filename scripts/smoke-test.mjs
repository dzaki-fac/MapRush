import WebSocket from "ws";

const URL = process.env.WS_URL ?? "ws://localhost:8080";

function client(name) {
  const ws = new WebSocket(URL);
  const state = { ws, messages: [], id: null, code: null, room: null, notices: [] };
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    state.messages.push(msg);
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

function send(state, message) {
  state.ws.send(JSON.stringify(message));
}

function waitFor(predicate, label, timeout = 4000) {
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

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const a = client("A");
const b = client("B");

await Promise.all([
  waitFor(() => a.ws.readyState === WebSocket.OPEN, "A open"),
  waitFor(() => b.ws.readyState === WebSocket.OPEN, "B open"),
]);

send(a, { type: "CREATE_ROOM", nickname: "Alpha" });
await waitFor(() => a.code, "room created");
console.log("Room:", a.code);

send(b, { type: "JOIN_ROOM", roomCode: a.code, nickname: "Beta" });
await waitFor(() => b.id && b.room?.players.length === 2, "B joined");
await waitFor(() => a.room?.players.length === 2, "A sees B");
assert(a.room.players.length === 2, "room has 2 players");

send(a, { type: "START_GAME", roomCode: a.code, playerId: a.id });
await waitFor(() => a.room?.status === "countdown" && b.room?.status === "countdown", "countdown visible");
console.log("Countdown:", Math.ceil(a.room.countdownMs / 1000), "detik");
await waitFor(() => a.room?.status === "playing" && b.room?.status === "playing", "game started", 6000);

send(a, { type: "SUBMIT_GUESS", roomCode: a.code, playerId: a.id, guess: "indonesia" });
await waitFor(() => a.notices.length >= 1, "A guess notice");
assert(a.notices.at(-1).kind === "correct", "indonesia is correct");
await waitFor(() => b.room?.usedCountries.length === 1, "B sees used country");
assert(b.room.usedCountries[0].name === "Indonesia", "canonical name stored");

send(b, { type: "SUBMIT_GUESS", roomCode: a.code, playerId: b.id, guess: "INDONESIA" });
await waitFor(() => b.notices.length >= 1, "B duplicate notice");
assert(b.notices.at(-1).kind === "duplicate", "duplicate detected case-insensitively");

send(b, { type: "SUBMIT_GUESS", roomCode: a.code, playerId: b.id, guess: "USA" });
await waitFor(() => b.notices.length >= 2, "B alias notice");
assert(b.notices.at(-1).kind === "correct", "USA alias accepted");

send(b, { type: "SUBMIT_GUESS", roomCode: a.code, playerId: b.id, guess: "kerajaan pizza" });
await waitFor(() => b.notices.length >= 3, "B invalid notice");
assert(b.notices.at(-1).kind === "invalid", "invalid country rejected");

await waitFor(() => a.room?.usedCountries.length === 2, "both see 2 countries");
assert(a.room.players.find((p) => p.id === a.id).score === 1, "A score = 1");
assert(b.room.players.find((p) => p.id === b.id).score === 1, "B score = 1");

console.log("Scores:", a.room.players.map((p) => `${p.nickname}=${p.score}`).join(", "));
console.log("Used:", a.room.usedCountries.map((u) => u.name).join(", "));
// Mode solo: satu pemain, langsung countdown, lalu bisa menebak.
const c = client("C");
await waitFor(() => c.ws.readyState === WebSocket.OPEN, "C open");
send(c, { type: "CREATE_SOLO", nickname: "Solo" });
await waitFor(() => c.code && c.room?.mode === "solo", "solo room created");
assert(c.room.status === "countdown", "solo starts with countdown");
send(c, { type: "SUBMIT_GUESS", roomCode: c.code, playerId: c.id, guess: "Japan" });
await waitFor(() => c.notices.length >= 1, "early guess notice");
assert(c.notices.at(-1).kind === "info", "guess during countdown is ignored");
await waitFor(() => c.room?.status === "playing", "solo game started", 6000);
send(c, { type: "SUBMIT_GUESS", roomCode: c.code, playerId: c.id, guess: "Japan" });
await waitFor(() => c.notices.length >= 2, "solo guess notice");
assert(c.notices.at(-1).kind === "correct", "solo guess accepted");
console.log("Solo room:", c.code, "| skor:", c.room.players[0].score);

console.log("SMOKE TEST PASSED ✅");

a.ws.close();
b.ws.close();
c.ws.close();
process.exit(0);
