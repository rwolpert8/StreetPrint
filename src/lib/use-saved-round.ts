"use client";

import { useEffect, useRef, useState } from "react";
import { cities, type City } from "@/data/cities";
import type { Puzzle } from "@/data/puzzle";
import { emptyRound, submitGuess, type Round } from "./game";
import { clearProgress, loadProgress, saveProgress } from "./progress";

// Access inside the guarded storage functions: even the localStorage getter can throw.
const browserStorage = () => window.localStorage;

export function useSavedRound(puzzle: Puzzle) {
  const [state, setState] = useState({ round: emptyRound, ready: false, available: true });
  const current = useRef<Round | null>(null);

  useEffect(() => {
    const loaded = loadProgress(browserStorage, puzzle, cities);
    current.current = loaded.round;
    setState({ ...loaded, ready: true });
    return () => { current.current = null; };
  }, [puzzle]);

  function guess(city: City) {
    if (!current.current) return;
    const next = submitGuess(current.current, city, puzzle.target);
    if (next === current.current) return;
    current.current = next;
    // Save in the event handler, before navigation can unmount this puzzle.
    // No saving effect runs with the initial empty state or during restoration.
    const available = saveProgress(browserStorage, puzzle, next);
    setState({ round: next, ready: true, available });
  }

  function restart() {
    if (!current.current) return;
    current.current = emptyRound;
    const available = clearProgress(browserStorage, puzzle.id);
    setState({ round: emptyRound, ready: true, available });
  }

  return { ...state, guess, restart };
}
