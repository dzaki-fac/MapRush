export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;

  if (typeof window === "undefined") return "ws://localhost:8080";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Saat development_next berjalan di :3000, WebSocket server berdiri sendiri di :8080.
  if (window.location.port === "3000") return "ws://localhost:8080";
  return `${protocol}//${window.location.host}`;
}
