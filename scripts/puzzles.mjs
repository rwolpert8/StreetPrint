import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readDefinitions, readPuzzleAsset, root, renderVersion } from "./puzzle-config.mjs";

try {
  const [command = "list", id, ...options] = process.argv.slice(2);
  const definitions = await readDefinitions();
  if (command === "list") {
    for (const puzzle of definitions) {
      let state = "ready";
      try { await readPuzzleAsset(puzzle); } catch { state = "needs generation"; }
      console.log(`${puzzle.id}  ${puzzle.enabled ? "enabled" : "draft"}  ${puzzle.city.name}, ${puzzle.city.country}  (${state})`);
    }
  } else if (command === "check") {
    for (const puzzle of definitions.filter((p) => p.enabled)) await readPuzzleAsset(puzzle);
    console.log(`Valid definitions; ${definitions.filter((p) => p.enabled).length} enabled maps ready. Draft maps are optional.`);
  } else if (command === "generate") {
    const puzzle = definitions.find((p) => p.id === id);
    if (!puzzle) throw new Error(`Choose a puzzle ID from puzzles.json. Example: npm run puzzles:generate -- study-006`);
    // Only these options are forwarded. Generation settings come from puzzles.json.
    for (let i = 0; i < options.length; i++) {
      if (options[i] === "--reuse-graph") continue;
      if (options[i] === "--overpass-url" && /^https?:\/\//.test(options[i + 1] ?? "")) { i++; continue; }
      throw new Error(`Unknown or incomplete option: ${options[i]}`);
    }
    const python = fileURLToPath(new URL(process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python", root));
    if (!existsSync(python)) throw new Error("Python environment missing. Follow the setup steps in docs/GENERATING-PUZZLES.md.");
    const child = spawn(python, ["scripts/generate-puzzle.py", ...options], { cwd: fileURLToPath(root), stdio: ["pipe", "inherit", "inherit"], windowsHide: true });
    child.stdin.on("error", () => {}); // A failed interpreter can close stdin early.
    child.stdin.end(JSON.stringify({ puzzle, renderVersion }));
    child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
    child.on("exit", (code) => { process.exitCode = code ?? 1; });
  } else throw new Error("Use npm run puzzles:list, puzzles:check, or puzzles:generate -- study-006.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
