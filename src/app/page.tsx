import { GameRound } from "@/components/game-round";
import { HowToPlay } from "@/components/how-to-play";
import { PuzzleMap } from "@/components/puzzle-map";

export default function Home() {
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to puzzle</a>
    <header className="site-header flex items-center justify-between">
      <span className="wordmark"><span aria-hidden="true">🌍</span> StreetPrint</span>
      <HowToPlay />
    </header>
    <main id="main">
      <div className="page-intro"><div><h1>Which city is this?</h1><p>Identify the city from the streets and water.</p></div><span className="practice-label">Practice puzzle · 001</span></div>
      <div className="puzzle-layout grid items-start"><PuzzleMap /><GameRound /></div>
    </main>
    <footer className="site-footer flex flex-wrap items-center justify-between gap-3"><span><span aria-hidden="true">🗺️</span> StreetPrint</span><span>Practice mode · Daily puzzles coming later</span></footer>
  </div>;
}
