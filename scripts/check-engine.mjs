import {
  createRoom,
  joinRoom,
  startGame,
  applyGuess,
  finishGame,
  rematch,
} from "../server/gameEngine.ts";

let { room, playerId } = createRoom("Alpha");
const p2 = joinRoom(room, "Beta");
startGame(room);

applyGuess(room, playerId, "Indonesia");
applyGuess(room, playerId, "Japan");
applyGuess(room, p2.id, "Brazil");

finishGame(room);
console.log("status:", room.status, "| result:", room.result);
if (room.result.draw || room.result.winnerId !== playerId) throw new Error("Expected Alpha to win");
if (room.result.scores[playerId] !== 2 || room.result.scores[p2.id] !== 1) throw new Error("Wrong scores");

const started = rematch(room);
console.log("rematch started:", started, "| status:", room.status, "| used:", room.usedCountries.length, "| scores:", room.players.map((p) => p.score));
if (!started || room.status !== "playing" || room.usedCountries.length !== 0) throw new Error("Rematch failed");
if (room.players.some((p) => p.score !== 0)) throw new Error("Scores not reset");

console.log("ENGINE TEST PASSED ✅");
