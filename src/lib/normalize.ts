/**
 * Normalisasi nama negara:
 * - case-insensitive
 * - buang aksen/diacritics (é -> e)
 * - "&" dibaca "and"
 * - buang tanda baca, rapikan spasi
 */
export function normalizeCountryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeNickname(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
