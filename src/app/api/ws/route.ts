import { connection } from "next/server";
import { upgradeWebSocket } from "@vercel/functions";
import { GameServer } from "../../../../server/gameServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WebSocket native Vercel Functions.
 *
 * Client di produksi terhubung ke wss://<domain>/api/ws — tidak perlu server
 * terpisah. `game` adalah instance module-level, sehingga room-room tetap
 * hidup selama instance Function yang sama menangani koneksi tersebut.
 */
const game = new GameServer();

export async function GET() {
  await connection();
  return upgradeWebSocket((ws) => game.handleConnection(ws));
}
