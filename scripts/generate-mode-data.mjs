import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const rawCountries = require("world-countries");

const root = process.cwd();
const topology = JSON.parse(
  fs.readFileSync(
    path.join(root, "public/geographies/countries-110m.json"),
    "utf8",
  ),
);
const geometryIds = new Set(
  feature(topology, topology.objects.countries).features
    .map((item) => String(Number(item.id)))
    .filter((code) => code !== "NaN"),
);

const EXTRA_ISO3 = new Set(["TWN", "XKX", "UNK", "PSE", "VAT"]);

function continentOf(country) {
  switch (country.region) {
    case "Africa":
      return "Africa";
    case "Asia":
      return "Asia";
    case "Europe":
      return "Europe";
    case "Oceania":
      return "Oceania";
    case "Americas":
      return country.subregion === "South America"
        ? "South America"
        : "North America";
    default:
      return null;
  }
}

const continentByCode = {};
const clickableCodes = [];

for (const country of rawCountries) {
  if (
    country.unMember !== true &&
    country.independent !== true &&
    !EXTRA_ISO3.has(country.cca3)
  ) {
    continue;
  }

  const code = String(Number(country.ccn3));
  if (!/^\d+$/.test(code)) continue;

  const continent = continentOf(country);
  if (continent) continentByCode[code] = continent;
  if (geometryIds.has(code)) clickableCodes.push(code);
}

clickableCodes.sort();
const codes = Object.keys(continentByCode).sort();
const continentEntries = codes
  .map((code) => `  "${code}": "${continentByCode[code]}",`)
  .join("\n");
const clickableEntries = clickableCodes.map((code) => `  "${code}",`).join("\n");

fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "src/data/continent-codes.ts"),
  `import type { Continent } from "@/shared/types";\n\nexport const CONTINENTS: readonly Continent[] = [\n  "Asia",\n  "Europe",\n  "Africa",\n  "North America",\n  "South America",\n  "Oceania",\n];\n\nexport const CONTINENT_BY_CODE: Record<string, Continent> = {\n${continentEntries}\n};\n`,
);
fs.writeFileSync(
  path.join(root, "src/data/map-country-codes.ts"),
  `/** ccn3 dari negara yang memiliki geometri clickable pada peta 110m. */\nexport const MAP_COUNTRY_CODES: readonly string[] = [\n${clickableEntries}\n];\n`,
);

console.log(
  `[maprush] generated ${codes.length} continent codes and ${clickableCodes.length} clickable map codes`,
);
