"use client";

import { useEffect, useState } from "react";
import type { Puzzle } from "@/data/puzzle";
import { GameRound } from "./game-round";
import { PuzzleMap } from "./puzzle-map";

const LAST_PUZZLE_KEY = "streetprint-last-puzzle";

export function PracticeGame({ puzzles }: { puzzles: Puzzle[] }) {
  const [puzzleId, setPuzzleId] = useState(puzzles.find((item) => item.id === "study-003")?.id ?? puzzles[0]?.id);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_PUZZLE_KEY);
      if (puzzles.some((item) => item.id === saved)) setPuzzleId(saved!);
    } catch { /* Each round reports unavailable storage without blocking play. */ }
    setReady(true);
  }, [puzzles]);

  function selectPuzzle(id: string) {
    setPuzzleId(id);
    try { localStorage.setItem(LAST_PUZZLE_KEY, id); } catch { /* Selection still works. */ }
  }
  const puzzle = puzzles.find((item) => item.id === puzzleId) ?? puzzles[0];
  if (!puzzle) return <p>No practice puzzles are enabled yet.</p>;

  return <>
    <div className="page-intro">
      <div><h1>Which city is this?</h1><p>Identify the city from the streets and water.</p></div>
      <div className="practice-picker">
        <label htmlFor="practice-puzzle">Practice puzzle</label>
        <select id="practice-puzzle" value={puzzle.id} disabled={!ready} onChange={(event) => selectPuzzle(event.target.value)} aria-describedby="practice-reset-note">
          {puzzles.map((item) => <option key={item.id} value={item.id}>Puzzle {item.number}</option>)}
        </select>
        <span id="practice-reset-note">Progress is saved per puzzle in this browser.</span>
      </div>
    </div>
    {/* Restore each puzzle's round independently; reset zoom when switching maps. */}
    {ready ? <div key={`${puzzle.id}:${puzzle.signature}`} className="puzzle-layout grid items-start">
      <PuzzleMap image={puzzle.image} widthM={puzzle.widthM} /><GameRound puzzle={puzzle} />
    </div> : <p role="status">Loading your puzzles…</p>}
  </>;
}
