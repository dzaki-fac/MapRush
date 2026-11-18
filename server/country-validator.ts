import { COUNTRIES, findCountryByGuess } from "../src/lib/countries";
import { CONTINENT_BY_CODE } from "../src/data/continent-codes";
import { MAP_COUNTRY_CODES } from "../src/data/map-country-codes";
import type { Continent } from "../src/shared/types";

const byCode = new Map(
  COUNTRIES.map((country) => [String(Number(country.ccn3)), country]),
);

/** Klasifikasi benua eksplisit dari dataset, bukan tebakan saat runtime. */
export function continentOfCode(ccn3: string): Continent | null {
  return CONTINENT_BY_CODE[ccn3] ?? null;
}

export function countryByCode(ccn3: string) {
  return byCode.get(ccn3) ?? null;
}

/** Negara yang bisa diklik di peta dan bukan kandidat yang sudah dipakai. */
export function randomClickableCountry(excluded: Set<string>) {
  const pool = MAP_COUNTRY_CODES.filter((code) => !excluded.has(code));
  if (!pool.length) return null;
  const code = pool[Math.floor(Math.random() * pool.length)];
  return countryByCode(code);
}

/** Semua negara clickable beserta benuanya — dipakai Continent Rush. */
export function countriesWithContinent() {
  return MAP_COUNTRY_CODES.map((code) => ({
    country: byCode.get(code),
    continent: continentOfCode(code),
  })).filter(
    (
      item,
    ): item is { country: NonNullable<typeof item.country>; continent: Continent } =>
      Boolean(item.country && item.continent),
  );
}

export function findCountry(guess: string) {
  return findCountryByGuess(guess);
}
