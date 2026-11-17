import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/world-atlas/countries-110m.json");
const targetDir = resolve(root, "public/geographies");
const target = resolve(targetDir, "countries-110m.json");

if (existsSync(source)) {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, target);
  console.log("[maprush] geography copied -> public/geographies/countries-110m.json");
} else {
  console.warn("[maprush] world-atlas not installed yet; skipping geography copy.");
}
