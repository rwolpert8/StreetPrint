"use client";

import { useState } from "react";
import { puzzles } from "@/data/puzzle";
import { GameRound } from "./game-round";
import { PuzzleMap } from "./puzzle-map";

export function PracticeGame() {
  const [puzzleId, setPuzzleId] = useState("study-003");
  const puzzle = puzzles.find((item) => item.id === puzzleId)!;

  return <>
    <div className="page-intro">
      <div><h1>Which city is this?</h1><p>Identify the city from the streets and water.</p></div>
      <div className="practice-picker">
        <label htmlFor="practice-puzzle">Practice puzzle</label>
        <select id="practice-puzzle" value={puzzleId} onChange={(event) => setPuzzleId(event.target.value)} aria-describedby="practice-reset-note">
          {puzzles.map((item) => <option key={item.id} value={item.id}>Puzzle {item.number}</option>)}
        </select>
        <span id="practice-reset-note">Switching puzzles starts a new round.</span>
      </div>
    </div>
    {/* Remount both panels together so guesses and zoom cannot carry into another puzzle. */}
    <div key={puzzle.id} className="puzzle-layout grid items-start">
      <PuzzleMap image={puzzle.image} /><GameRound puzzle={puzzle} />
    </div>
  </>;
}
