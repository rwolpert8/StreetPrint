import { PracticeGame } from "@/components/practice-game";
import { HowToPlay } from "@/components/how-to-play";

export default function Home() {
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to puzzle</a>
    <header className="site-header flex items-center justify-between">
      <span className="wordmark"><span aria-hidden="true">🌍</span> StreetPrint</span>
      <HowToPlay />
    </header>
    <main id="main">
      <PracticeGame />
    </main>
    <footer className="site-footer flex flex-wrap items-center justify-between gap-3"><span><span aria-hidden="true">🗺️</span> StreetPrint</span><span>Practice mode · Daily puzzles coming later</span></footer>
  </div>;
}
