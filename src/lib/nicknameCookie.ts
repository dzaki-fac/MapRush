const KEY = "maprush.nickname";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 tahun

/** Nickname tersimpan di cookie agar tidak perlu diketik ulang. */
export function getSavedNickname(): string {
  if (typeof document === "undefined") return "";
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${KEY}=`));
  if (!entry) return "";
  try {
    return decodeURIComponent(entry.slice(KEY.length + 1));
  } catch {
    return "";
  }
}

export function saveNickname(nickname: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${KEY}=${encodeURIComponent(
    nickname.trim(),
  )}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}
