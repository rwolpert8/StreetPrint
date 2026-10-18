import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Python remains offline. Next.js serves a copy of its reviewed output.
const root = new URL("../", import.meta.url);
await mkdir(new URL("public/puzzles/", root), { recursive: true });
const svg = await readFile(new URL("output/6000m-streets-water/paris.svg", root), "utf8");
await writeFile(
  new URL("public/puzzles/study-001.svg", root),
  svg.replace('fill="#faf9f6"', 'fill="#ffffff"'),
);
console.log(`Prepared puzzle asset in ${fileURLToPath(new URL("public/puzzles/", root))}`);
