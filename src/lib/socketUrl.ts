/**
 * URL WebSocket server.
 *
 * - Development: Next di :3000, WS server mandiri di :8080.
 * - Produksi: WAJIB diisi NEXT_PUBLIC_WS_URL dengan alamat wss:// server WS.
 *
 * Mengembalikan "" jika tidak ada konfigurasi yang valid, supaya UI bisa
 * menampilkan pesan yang jelas daripada menggantung di status "Menghubungkan".
 */
export function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) return configured;

  if (typeof window === "undefined") return "ws://localhost:8080";

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "ws://localhost:8080";

  return "";
}
