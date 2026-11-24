import assert from "node:assert/strict";
import test from "node:test";
import { cities, catalogueCities, mergePuzzleCities, type City } from "../data/cities";
import overrides from "../../data/city-overrides.json";
import { cityLabel, createCitySearch, searchCities } from "./city-search";
import { emptyRound, submitGuess } from "./game";
import { restoreRound } from "./progress";

test("aliases and accents resolve to the intended city", () => {
  for (const [query, id] of [[" NYC ", "us-new-york"], ["munchen", "de-munich"], ["sao paulo", "br-sao-paulo"], ["東京", "jp-tokyo"]]) {
    assert.equal(searchCities(query)[0]?.id, id);
  }
});

test("duplicate names remain distinct and can be qualified", () => {
  assert.deepEqual(searchCities("Paris").slice(0, 2).map((city) => city.id), ["fr-paris", "us-paris-tx"]);
  assert.equal(searchCities("Paris Texas")[0]?.id, "us-paris-tx");
  assert.equal(cityLabel(searchCities("Paris Texas")[0]), "Paris, Texas, United States");
});

test("empty and unknown queries do not silently select a city", () => {
  assert.deepEqual(searchCities("  "), []);
  assert.deepEqual(searchCities("zzzzzz"), []);
  assert.ok(searchCities("p").length > 2);
  assert.ok(searchCities("a", 3).length <= 3);
  assert.deepEqual(searchCities("Paris", 0), []);
  assert.deepEqual(searchCities("Paris", -1), []);
  assert.deepEqual(searchCities("---"), []);
});

test("catalogue IDs are unique and coordinates are valid", () => {
  assert.equal(new Set(cities.map((city) => city.id)).size, cities.length);
  assert.ok(cities.every((city) => Math.abs(city.latitude) <= 90 && Math.abs(city.longitude) <= 180));
});

test("new cities are searchable across all six supported continents", () => {
  assert.ok(catalogueCities.length > 10000);
  for (const [query, id, continent] of [
    ["Lagos", "geonames-2332459", "Africa"],
    ["Dhaka", "geonames-1185241", "Asia"],
    ["Kyiv", "geonames-703448", "Europe"],
    ["Washington United States", "geonames-4140963", "North America"],
    ["Rio de Janeiro", "geonames-3451190", "South America"],
    ["Suva", "geonames-2198148", "Oceania"],
  ]) {
    assert.equal(searchCities(query)[0]?.id, id, query);
    assert.equal(searchCities(query)[0]?.continent, continent);
  }
});

test("qualified names, aliases, punctuation, and state codes disambiguate results", () => {
  for (const [query, id] of [
    ["Portland ME", "geonames-4975802"],
    ["Portland, Oregon, United States", "us-portland-or"],
    ["London Ontario", "geonames-6058560"],
    ["London UK", "gb-london"],
    ["NYC USA", "us-new-york"],
    ["Bombay India", "in-mumbai"],
    ["Rio Brazil", "geonames-3451190"],
  ]) assert.equal(searchCities(query)[0]?.id, id, query);
  assert.deepEqual(searchCities("Paris Japan"), []);
});

test("exact names beat aliases and prefixes; population breaks ties without puzzle priority", () => {
  const base = cities.find((city) => city.id === "fr-paris")!;
  const candidates: City[] = [
    { ...base, id: "small", name: "Springfield", population: 100, aliases: [] },
    { ...base, id: "large", name: "Springfield", population: 100000, aliases: [] },
    { ...base, id: "alias", name: "Other City", population: 1000000, aliases: ["Springfield"] },
    { ...base, id: "prefix", name: "Springfield Heights", population: 2000000, aliases: [] },
  ];
  const expected = ["large", "small", "alias", "prefix"];
  assert.deepEqual(createCitySearch(candidates)("Springfield").map((city) => city.id), expected);
  assert.deepEqual(createCitySearch([...candidates].reverse())("Springfield").map((city) => city.id), expected);
});

test("all existing city IDs, aliases, and scoring coordinates survive the import", () => {
  assert.equal(new Set(catalogueCities.map((city) => city.geonameId)).size, catalogueCities.length);
  for (const previous of overrides) {
    const city = cities.find((entry) => entry.id === previous.id)!;
    assert.ok(city, previous.id);
    assert.equal(city.geonameId, previous.geonameId);
    assert.equal(city.latitude, previous.latitude);
    assert.equal(city.longitude, previous.longitude);
    assert.equal(city.countryCode, previous.countryCode);
    assert.equal(city.continent, previous.continent);
    for (const alias of previous.aliases) {
      assert.ok(searchCities(alias, cities.length).some((result) => result.id === city.id), alias);
    }
  }
});

test("a new puzzle reuses its imported city and keeps its aliases and saved guesses", () => {
  const imported = cities.find((city) => city.id === "geonames-3451190")!;
  const answer = { ...imported, name: "Rio de Janeiro", aliases: ["Rio"] };
  const merged = mergePuzzleCities(catalogueCities, [answer]);
  assert.equal(merged.length, catalogueCities.length);
  const target = merged.find((city) => city.id === imported.id)!;
  assert.ok(imported.aliases.every((alias) => target.aliases.includes(alias) || alias === target.name));
  assert.equal(submitGuess(emptyRound, imported, target).status, "won");
  const identity = { id: "test-puzzle", signature: "unchanged", target: cities.find((city) => city.id === "fr-paris")! };
  const raw = JSON.stringify({ version: 1, signature: identity.signature,
    guessIds: ["gb-london", imported.id, "fr-paris"], updatedAt: "2026-11-21T12:00:00Z" });
  assert.equal(restoreRound(raw, identity, merged)?.status, "won");
});
