import type { City } from "../data/cities";
import { emptyRound, MAX_GUESSES, submitGuess, type Round } from "./game";

type PuzzleIdentity = { id: string; signature: string; target: City };
type ProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type StorageProvider = () => ProgressStorage;
const VERSION = 1;
export const progressKey = (id: string) => `streetprint-progress:${id}`;

// Only IDs are saved. Feedback and completion are rebuilt using current game rules.
export function restoreRound(raw: string, puzzle: PuzzleIdentity, cities: City[]): Round | null {
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== VERSION || data.signature !== puzzle.signature ||
        typeof data.updatedAt !== "string" || !Number.isFinite(Date.parse(data.updatedAt)) ||
        !Array.isArray(data.guessIds) || data.guessIds.length > MAX_GUESSES) return null;
    let round = emptyRound;
    for (const id of data.guessIds) {
      const city = cities.find((entry) => entry.id === id);
      if (!city || round.status !== "playing" || round.guesses.some((guess) => guess.id === id)) return null;
      round = submitGuess(round, city, puzzle.target);
    }
    return round;
  } catch { return null; }
}

export function loadProgress(storage: StorageProvider, puzzle: PuzzleIdentity, cities: City[]) {
  try {
    const store = storage();
    const raw = store.getItem(progressKey(puzzle.id));
    if (raw === null) return { round: emptyRound, available: true };
    const round = restoreRound(raw, puzzle, cities);
    if (!round) store.removeItem(progressKey(puzzle.id));
    return { round: round ?? emptyRound, available: true };
  } catch { return { round: emptyRound, available: false }; }
}

export function saveProgress(storage: StorageProvider, puzzle: PuzzleIdentity, round: Round): boolean {
  try {
    storage().setItem(progressKey(puzzle.id), JSON.stringify({
      version: VERSION,
      signature: puzzle.signature,
      guessIds: round.guesses.map((city) => city.id),
      updatedAt: new Date().toISOString(),
    }));
    return true;
  } catch { return false; }
}

export function clearProgress(storage: StorageProvider, puzzleId: string): boolean {
  try { storage().removeItem(progressKey(puzzleId)); return true; }
  catch { return false; }
}
