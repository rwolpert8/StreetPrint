import definitions from "../../puzzles.json";
import { cities, type City } from "./cities";

export type Puzzle = { id: string; number: string; image: string; target: City; reveal: string; widthM: number; signature: string };

// Validated by npm run assets before development and builds. Answers are inspectable.
export const puzzles: Puzzle[] = definitions.puzzles.filter((puzzle) => puzzle.enabled).map((puzzle) => ({
  id: puzzle.id,
  number: puzzle.id.replace(/^study-/, ""),
  image: `/puzzles/${puzzle.id}.svg`,
  target: cities.find((city) => city.id === puzzle.city.id)!,
  reveal: puzzle.reveal,
  widthM: puzzle.map.widthM,
  // Editorial text and city display names do not invalidate a saved round.
  // The server page also fingerprints the actual SVG before sending puzzles to the UI.
  signature: JSON.stringify([
    puzzle.city.id, puzzle.city.countryCode, puzzle.city.continent,
    puzzle.city.latitude, puzzle.city.longitude,
    puzzle.map.center, puzzle.map.widthM, puzzle.map.coastline,
  ]),
}));
