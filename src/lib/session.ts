export interface Session {
  roomCode: string;
  playerId: string;
  nickname: string;
}

const KEY = "maprush.session";

export function saveSession(session: Session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* sessionStorage tidak tersedia */
  }
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.roomCode || !parsed.playerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
