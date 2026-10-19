import { cities, type City } from "./cities";

export type Puzzle = { id: string; number: string; image: string; target: City; reveal: string };

// Fixed practice rounds for now. Client-side answers are inspectable.
export const puzzles: Puzzle[] = [{
  id: "study-001",
  number: "001",
  image: "/puzzles/study-001.svg",
  target: cities.find((city) => city.id === "fr-paris")!,
  reveal: "Paris combines an irregular older street network with long avenues. The Seine and its islands cut through the centre of this diagram.",
}, {
  id: "study-002",
  number: "002",
  image: "/puzzles/study-002.svg",
  target: cities.find((city) => city.id === "jp-tokyo")!,
  reveal: "This 6 × 6 km crop is centred on Tokyo Station. Compare the dense local streets with the larger gaps and light-blue waterways.",
}, {
  id: "study-003",
  number: "003",
  image: "/puzzles/study-003.svg",
  target: cities.find((city) => city.id === "us-new-york")!,
  reveal: "This crop focuses on Midtown Manhattan. Look for its rotated street grid and the water separating Manhattan from the surrounding street networks.",
}, {
  id: "study-004",
  number: "004",
  image: "/puzzles/study-004.svg",
  target: cities.find((city) => city.id === "es-barcelona")!,
  reveal: "This crop includes the Eixample and the old city. Compare the regular blocks with the smaller, irregular streets near the coast.",
}, {
  id: "study-005",
  number: "005",
  image: "/puzzles/study-005.svg",
  target: cities.find((city) => city.id === "au-sydney")!,
  reveal: "This crop focuses on central Sydney. Follow the harbour's branching shoreline and notice how the street grids change direction around it.",
}];
