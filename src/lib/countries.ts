import rawCountries from "world-countries";
import { normalizeCountryName } from "./normalize";

export interface Country {
  name: string;
  official: string;
  ccn3: string;
  cca3: string;
  cca2: string;
  flag: string;
}

/** Negara/entitas tambahan yang bukan UN member tapi umum dianggap berdaulat. */
const EXTRA_ISO3 = new Set(["TWN", "XKX", "UNK", "PSE", "VAT"]);

/**
 * Daftar negara valid. Sengaja dipisah dari logika game supaya mudah diganti
 * sumber datanya (mis. dari API / DB) tanpa menyentuh engine.
 */
export const COUNTRIES: Country[] = rawCountries
  .filter(
    (c) =>
      c.unMember === true || c.independent === true || EXTRA_ISO3.has(c.cca3),
  )
  .map((c) => ({
    name: c.name.common,
    official: c.name.official,
    ccn3: c.ccn3,
    cca3: c.cca3,
    cca2: c.cca2,
    flag: c.flag,
  }));

const byIso3 = new Map<string, Country>();
for (const country of COUNTRIES) byIso3.set(country.cca3, country);

/** Alias tambahan di luar altSpellings bawaan world-countries. */
const CUSTOM_ALIASES: Record<string, string> = {
  usa: "USA",
  "u s a": "USA",
  us: "USA",
  america: "USA",
  "united states": "USA",
  "united states of america": "USA",
  uk: "GBR",
  "u k": "GBR",
  britain: "GBR",
  england: "GBR",
  "great britain": "GBR",
  "united kingdom": "GBR",
  uae: "ARE",
  "united arab emirates": "ARE",
  russia: "RUS",
  vietnam: "VNM",
  "viet nam": "VNM",
  korea: "KOR",
  "south korea": "KOR",
  "republic of korea": "KOR",
  "north korea": "PRK",
  dprk: "PRK",
  iran: "IRN",
  syria: "SYR",
  bolivia: "BOL",
  venezuela: "VEN",
  tanzania: "TZA",
  moldova: "MDA",
  czechia: "CZE",
  "czech republic": "CZE",
  "cote divoire": "CIV",
  "cote d ivoire": "CIV",
  ivory: "CIV",
  "dr congo": "COD",
  drc: "COD",
  "democratic republic of the congo": "COD",
  "congo kinshasa": "COD",
  "republic of the congo": "COG",
  "congo brazzaville": "COG",
  "south africa": "ZAF",
  "new zealand": "NZL",
  laos: "LAO",
  brunei: "BRN",
  macedonia: "MKD",
  "north macedonia": "MKD",
  swaziland: "SWZ",
  eswatini: "SWZ",
  burma: "MMR",
  palestine: "PSE",
  "palestinian territories": "PSE",
  vatican: "VAT",
  "vatican city": "VAT",
  "holy see": "VAT",
  taiwan: "TWN",
  kosovo: "UNK",
  "cape verde": "CPV",
  "cabo verde": "CPV",
  turkey: "TUR",
  turkiye: "TUR",
  "the netherlands": "NLD",
  holland: "NLD",
  "the gambia": "GMB",
  "the bahamas": "BHS",
  "the philippines": "PHL",
};

/** Index: normalisasi nama -> Country. Dibangun sekali saat modul dimuat. */
const lookup = new Map<string, Country>();

function register(key: string, country: Country, overwrite = false) {
  const normalized = normalizeCountryName(key);
  if (!normalized) return;
  if (overwrite || !lookup.has(normalized)) lookup.set(normalized, country);
}

for (const country of COUNTRIES) {
  register(country.name, country);
  register(country.official, country);
  if (country.cca2) register(country.cca2, country);
  if (country.cca3) register(country.cca3, country);
}

for (const [alias, iso3] of Object.entries(CUSTOM_ALIASES)) {
  const country = byIso3.get(iso3);
  if (country) register(alias, country, true);
}

/**
 * Cari country dari input bebas pemain.
 * Mengembalikan null jika bukan nama negara berdaulat yang dikenal.
 */
export function findCountryByGuess(guess: string): Country | null {
  const key = normalizeCountryName(guess);
  if (!key) return null;
  // Bentuk padat menangani input seperti "U.S.A." -> "u s a" -> "usa".
  return lookup.get(key) ?? lookup.get(key.replace(/\s/g, "")) ?? null;
}

/** Dipakai server saat membuat UsedCountry. */
export function toUsedCountryData(country: Country) {
  return { ccn3: country.ccn3, name: country.name };
}
