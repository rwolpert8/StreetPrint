import { cities } from "./cities";

// One fixed practice round for now. Client-side answers are inspectable.
export const puzzle = {
  id: "study-001",
  target: cities.find((city) => city.id === "fr-paris")!,
  reveal: "Paris combines an irregular older street network with long avenues. The Seine and its islands cut through the centre of this diagram.",
};
