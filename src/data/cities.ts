import definitions from "../../puzzles.json";
import snapshot from "./city-catalogue.json";

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania";

export type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  continent: Continent;
  latitude: number;
  longitude: number;
  aliases: string[];
  population?: number;
  geonameId?: number;
  countryAliases?: string[];
  regionCode?: string;
};

type CityRow = [id: string, name: string, countryCode: string, regionKey: string,
  latitude: number, longitude: number, population: number, aliases: string[], geonameId: number];
type Snapshot = {
  countries: Record<string, [name: string, continent: Continent, iso3: string]>;
  regions: Record<string, string>;
  cities: CityRow[];
};

// Checked-in, compact GeoNames snapshot. No network requests during play.
const data = snapshot as unknown as Snapshot;
export const catalogueCities: City[] = data.cities.map(([id, name, countryCode, regionKey, latitude, longitude, population, aliases, geonameId]) => {
  const [country, continent, iso3] = data.countries[countryCode];
  return {
    id, name, country, countryCode, continent, latitude, longitude, population, aliases, geonameId,
    region: data.regions[regionKey],
    // US state codes are familiar search qualifiers; other GeoNames admin codes often are numbers.
    regionCode: countryCode === "us" ? regionKey.split(".")[1] : undefined,
    countryAliases: [iso3, ...(countryCode === "gb" ? ["UK"] : [])],
  };
});

// Puzzle authors reuse catalogue IDs. Preserve imported aliases and ranking metadata
// when overriding the answer's display details or scoring coordinates.
export function mergePuzzleCities(base: City[], answers: City[]): City[] {
  const catalogue = new Map(base.map((city) => [city.id, city]));
  for (const answer of answers) {
    const imported = catalogue.get(answer.id);
    catalogue.set(answer.id, {
      ...imported, ...answer,
      aliases: [...new Set([...(imported?.aliases ?? []), ...(imported ? [imported.name] : []), ...answer.aliases])]
        .filter((name) => name !== answer.name),
    });
  }
  return [...catalogue.values()];
}

export const cities = mergePuzzleCities(catalogueCities,
  definitions.puzzles.filter((puzzle) => puzzle.enabled).map((puzzle) => puzzle.city as City));
