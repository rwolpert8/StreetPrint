import { cities, type City } from "../data/cities";

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function cityLabel(city: City): string {
  return [city.name, city.region, city.country].filter(Boolean).join(", ");
}

// Search only the city catalogue, never puzzle metadata or the current answer.
export function searchCities(query: string, limit = 8): City[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  return cities
    .map((city) => {
      const names = [city.name, ...city.aliases].map(normalize);
      const label = normalize(cityLabel(city));
      const rank = names.some((name) => name === normalized) ? 0
        : normalize(city.name).startsWith(normalized) ? 1
        : names.some((name) => name.startsWith(normalized)) ? 2
        : label.startsWith(normalized) ? 3
        : normalized.length > 1 && names.some((name) => name.includes(normalized)) ? 4
        : normalized.length > 1 && normalized.split(/[\s,]+/).filter(Boolean).every((word) => label.includes(word)) ? 5
        : Infinity;
      return { city, rank };
    })
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || a.city.name.localeCompare(b.city.name, "en") || a.city.country.localeCompare(b.city.country, "en"))
    .slice(0, Math.max(0, limit))
    .map(({ city }) => city);
}
