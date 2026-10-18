import type { City } from "../data/cities";

export const MAX_GUESSES = 6;
export type Feedback = "correct" | "country" | "continent" | "different";
export type Units = "km" | "mi";
export const FEEDBACK: Record<Feedback, { label: string; description: string }> = {
  different: { label: "Wrong continent", description: "The target is on a different continent." },
  continent: { label: "Right continent", description: "Same continent, different country." },
  country: { label: "Right country", description: "Same country, different city." },
  correct: { label: "Correct city", description: "You found the city!" },
};

const radians = (degrees: number) => degrees * Math.PI / 180;

// Great-circle distance and INITIAL bearing: from the guess toward the target.
// Coordinates are representative city centres, not the diagram's crop centre.
export function geography(from: Pick<City, "latitude" | "longitude">, to: Pick<City, "latitude" | "longitude">) {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = lat2 - lat1;
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const angle = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
  const distanceKm = 6371.0088 * angle;
  // Coincident and antipodal points have no unique initial direction.
  if (angle < 1e-10 || Math.abs(Math.PI - angle) < 1e-10) return { distanceKm, direction: null, arrow: null };
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const index = Math.round(bearing / 45) % 8;
  return { distanceKm, direction: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][index], arrow: ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][index] };
}

export function judge(guess: City, target: City): Feedback {
  if (guess.id === target.id) return "correct";
  if (guess.countryCode === target.countryCode) return "country";
  if (guess.continent === target.continent) return "continent";
  return "different";
}

export function formatDistance(km: number, units: Units): string {
  const distance = units === "mi" ? km / 1.609344 : km;
  return `${distance > 0 && distance < 1 ? "<1" : Math.round(distance).toLocaleString("en-US")} ${units}`;
}

export type Round = { guesses: City[]; status: "playing" | "won" | "lost" };
export const emptyRound: Round = { guesses: [], status: "playing" };

// Keep round transitions independent of React, including double-submit guards.
export function submitGuess(round: Round, guess: City, target: City): Round {
  if (round.status !== "playing" || round.guesses.some((previous) => previous.id === guess.id)) return round;
  const guesses = [...round.guesses, guess];
  const status = guess.id === target.id ? "won" : guesses.length >= MAX_GUESSES ? "lost" : "playing";
  return { guesses, status };
}
