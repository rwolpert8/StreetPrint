import definitions from "../../puzzles.json";
import { cities, type City } from "./cities";

export type Puzzle = { id: string; number: string; image: string; target: City; reveal: string; widthM: number };

// Validated by npm run assets before development and builds. Answers are inspectable.
export const puzzles: Puzzle[] = definitions.puzzles.filter((puzzle) => puzzle.enabled).map((puzzle) => ({
  id: puzzle.id,
  number: puzzle.id.replace(/^study-/, ""),
  image: `/puzzles/${puzzle.id}.svg`,
  target: cities.find((city) => city.id === puzzle.city.id)!,
  reveal: puzzle.reveal,
  widthM: puzzle.map.widthM,
}));
