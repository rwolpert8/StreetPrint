import { cities, type City } from "../data/cities";

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function cityLabel(city: City): string {
  return [city.name, city.region, city.country].filter(Boolean).join(", ");
}

// Normalize once, not thousands of names/aliases on every keypress. Sort by
// population once as well; that order breaks ties within each matching tier.
export function createCitySearch(catalogue: City[]) {
  const index = [...catalogue]
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0)
      || a.name.localeCompare(b.name, "en") || a.country.localeCompare(b.country, "en")
      || (a.region ?? "").localeCompare(b.region ?? "", "en") || a.id.localeCompare(b.id, "en"))
    .map((city) => {
      const name = normalize(city.name);
      const aliases = [...new Set(city.aliases.map(normalize))].filter((alias) => alias && alias !== name);
      const qualifiers = [...new Set([city.region, city.regionCode, city.country, city.countryCode, ...(city.countryAliases ?? [])]
        .filter((value): value is string => Boolean(value)).flatMap((value) => normalize(value).split(" ")))];
      return { city, name, aliases, qualifiers };
    });

  return (query: string, limit = 8): City[] => {
    const normalized = normalize(query);
    const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
    if (!normalized || count === 0) return [];
    const words = normalized.split(" ");
    const qualifiedQueries = words.slice(1).map((_, index) => ({
      name: words.slice(0, index + 1).join(" "), qualifiers: words.slice(index + 1),
    }));
    const matches: City[][] = Array.from({ length: 5 }, () => []);
    for (const { city, name, aliases, qualifiers } of index) {
      const nameRank = (query: string) => name === query ? 0
        : aliases.includes(query) ? 1
        : name.startsWith(query) ? 2
        : aliases.some((alias) => alias.startsWith(query)) ? 3
        : query.length > 1 && (name.includes(query) || aliases.some((alias) => alias.includes(query))) ? 4
        : Infinity;
      let rank = nameRank(normalized);
      for (const query of qualifiedQueries) {
        if (query.qualifiers.every((word) => qualifiers.some((token) => token.startsWith(word)))) {
          rank = Math.min(rank, nameRank(query.name));
        }
      }
      // Each tier is already in population order. Never sort thousands of matches.
      if (Number.isFinite(rank) && matches[rank].length < count) matches[rank].push(city);
    }
    return matches.flat().slice(0, count);
  };
}

// Search has no access to the current answer, puzzle order, or completion state.
export const searchCities = createCitySearch(cities);
