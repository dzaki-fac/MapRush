/** Warna pemain. Dipakai server saat membuat player dan client untuk mewarnai peta. */
export const PLAYER_COLORS = [
  "#22d3ee",
  "#fb923c",
  "#a78bfa",
  "#4ade80",
  "#f472b6",
  "#facc15",
  "#60a5fa",
  "#fb7185",
] as const;

/** Jumlah pemain minimum dan maksimum per room. */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

/** Durasi default World Conquest & Country Hunt (ms). */
export const GAME_DURATION_MS = 90_000;

/** Durasi default Continent Rush (ms). */
export const RUSH_DURATION_MS = 120_000;

/** Lama setiap benua aktif pada Continent Rush (ms). */
export const CONTINENT_INTERVAL_MS = 20_000;

/** Hitung mundur sebelum ronde dimulai (ms). */
export const COUNTDOWN_MS = 3_000;

/** Skor Country Hunt. */
export const HUNT_CORRECT_POINTS = 5;
export const HUNT_WRONG_POINTS = 1;

/** Lama satu target Country Hunt sebelum berganti otomatis (ms). */
export const HUNT_TARGET_MS = 5_000;

/** Tampilan awal peta: zoom 2x dan sedikit mengarah ke utara. */
export const MAP_DEFAULT_ZOOM = 2;
export const MAP_DEFAULT_CENTER: readonly [number, number] = [0, 18];

/** Batas panjang nickname. */
export const MAX_NICKNAME_LENGTH = 16;
