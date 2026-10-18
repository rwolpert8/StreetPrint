import assert from "node:assert/strict";
import test from "node:test";
import { cities } from "../data/cities";
import { cityLabel, searchCities } from "./city-search";

test("aliases and accents resolve to the intended city", () => {
  for (const [query, id] of [[" NYC ", "us-new-york"], ["munchen", "de-munich"], ["sao paulo", "br-sao-paulo"], ["東京", "jp-tokyo"]]) {
    assert.equal(searchCities(query)[0]?.id, id);
  }
});

test("duplicate names remain distinct and can be qualified", () => {
  assert.deepEqual(searchCities("Paris").map((city) => city.id), ["fr-paris", "us-paris-tx"]);
  assert.equal(searchCities("Paris Texas")[0]?.id, "us-paris-tx");
  assert.equal(cityLabel(searchCities("Paris Texas")[0]), "Paris, Texas, United States");
});

test("empty and unknown queries do not silently select a city", () => {
  assert.deepEqual(searchCities("  "), []);
  assert.deepEqual(searchCities("zzzzzz"), []);
  assert.ok(searchCities("p").length > 2);
  assert.equal(searchCities("p")[0].id, "fr-paris");
  assert.ok(searchCities("a", 3).length <= 3);
});

test("catalogue IDs are unique and coordinates are valid", () => {
  assert.equal(new Set(cities.map((city) => city.id)).size, cities.length);
  assert.ok(cities.every((city) => Math.abs(city.latitude) <= 90 && Math.abs(city.longitude) <= 180));
});
