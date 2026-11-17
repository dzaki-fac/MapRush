import { WebSocketServer } from "ws";
import { GameServer } from "./gameServer";

const PORT = Number(process.env.PORT ?? 8080);

const game = new GameServer();
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => game.handleConnection(ws));

console.log(`[maprush] WebSocket server listening on ws://localhost:${PORT}`);
