import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Python remains offline. Next.js serves a copy of its reviewed output.
const root = new URL("../", import.meta.url);
await mkdir(new URL("public/puzzles/", root), { recursive: true });
for (const [city, id] of [
  ["paris", "study-001"], ["tokyo", "study-002"], ["nyc", "study-003"],
  ["barcelona", "study-004"], ["sydney", "study-005"],
]) {
  const svg = await readFile(new URL(`output/6000m-streets-water/${city}.svg`, root), "utf8");
  await writeFile(
    new URL(`public/puzzles/${id}.svg`, root),
    svg.replace('fill="#faf9f6"', 'fill="#ffffff"'),
  );
}
console.log(`Prepared puzzle assets in ${fileURLToPath(new URL("public/puzzles/", root))}`);
