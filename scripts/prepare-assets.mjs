import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { readDefinitions, readPuzzleAsset, root } from "./puzzle-config.mjs";

try {
  const puzzles = (await readDefinitions()).filter((puzzle) => puzzle.enabled);
  // Check every enabled map first so missing/stale maps cannot partially update the demo.
  const assets = await Promise.all(puzzles.map(async (puzzle) => [puzzle.id, await readPuzzleAsset(puzzle)]));
  const destination = new URL("public/puzzles/", root);
  await mkdir(destination, { recursive: true });
  for (const [id, svg] of assets) {
    await writeFile(new URL(`${id}.svg`, destination), svg.replace('fill="#faf9f6"', 'fill="#ffffff"'));
  }
  const enabled = new Set(puzzles.map((puzzle) => `${puzzle.id}.svg`));
  // Only remove generated puzzle copies, never source SVGs or unrelated files.
  for (const filename of await readdir(destination)) {
    if (/^study-\d{3,}\.svg$/.test(filename) && !enabled.has(filename)) await unlink(new URL(filename, destination));
  }
  console.log(`Prepared ${assets.length} enabled puzzle maps from puzzles.json.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
