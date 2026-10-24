import { PracticeGame } from "@/components/practice-game";
import { HowToPlay } from "@/components/how-to-play";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { puzzles } from "@/data/puzzle";

export default async function Home() {
  // Runs on the server (at build time in production), never in the browser.
  const playablePuzzles = await Promise.all(puzzles.map(async (puzzle) => {
    const svg = await readFile(join(process.cwd(), "public", puzzle.image));
    const signature = createHash("sha256").update(puzzle.signature).update(svg).digest("hex");
    return { ...puzzle, signature, image: `${puzzle.image}?v=${signature.slice(0, 16)}` };
  }));
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to puzzle</a>
    <header className="site-header flex items-center justify-between">
      <span className="wordmark"><span aria-hidden="true">🌍</span> StreetPrint</span>
      <HowToPlay />
    </header>
    <main id="main">
      <PracticeGame puzzles={playablePuzzles} />
    </main>
    <footer className="site-footer flex flex-wrap items-center justify-between gap-3"><span><span aria-hidden="true">🗺️</span> StreetPrint</span><span>Practice mode · Daily puzzles coming later</span></footer>
  </div>;
}
