/**
 * URL WebSocket server.
 *
 * - Development: Next di :3000, WS server mandiri di :8080 (npm run dev).
 * - Vercel/produksi: WebSocket native di path /api/ws pada origin yang sama.
 * - NEXT_PUBLIC_WS_URL bisa dipakai untuk mengarahkan ke server WS eksternal.
 */
export function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) return configured;

  if (typeof window === "undefined") return "ws://localhost:8080";

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "ws://localhost:8080";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws`;
}
