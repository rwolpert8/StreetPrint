import assert from "node:assert/strict";
import test from "node:test";
import { cities } from "../data/cities";
import { emptyRound, formatDistance, geography, judge, submitGuess, type Round } from "./game";

const city = (id: string) => cities.find((entry) => entry.id === id)!;
const paris = city("fr-paris");

test("feedback prioritizes exact city, then country, then continent", () => {
  assert.equal(judge(paris, paris), "correct");
  assert.equal(judge(city("fr-lyon"), paris), "country");
  assert.equal(judge(city("gb-london"), paris), "continent");
  assert.equal(judge(city("us-paris-tx"), paris), "different");
  assert.equal(judge({ ...city("fr-lyon"), continent: "Asia" }, paris), "country");
});

test("distance and bearing go from guess to target and cross the date line", () => {
  const londonToParis = geography(city("gb-london"), paris);
  assert.ok(Math.abs(londonToParis.distanceKm - 343.6) < 1);
  assert.equal(londonToParis.direction, "SE");
  assert.equal(geography(paris, city("gb-london")).direction, "NW");
  const crossDateLine = geography({ latitude: 0, longitude: 179 }, { latitude: 0, longitude: -179 });
  assert.equal(crossDateLine.direction, "E");
  assert.ok(Math.abs(crossDateLine.distanceKm - 222.39) < 0.1);
  for (const [latitude, longitude, direction] of [[10, 0, "N"], [10, 10, "NE"], [0, 10, "E"], [-10, 10, "SE"], [-10, 0, "S"], [-10, -10, "SW"], [0, -10, "W"], [10, -10, "NW"]] as const) {
    assert.equal(geography({latitude: 0, longitude: 0}, {latitude, longitude}).direction, direction);
  }
});

test("zero distance and antipodes have no invented direction", () => {
  assert.equal(geography(paris, paris).distanceKm, 0);
  assert.equal(geography(paris, paris).direction, null);
  const antipodes = geography({latitude: 0, longitude: 0}, {latitude: 0, longitude: 180});
  assert.ok(Number.isFinite(antipodes.distanceKm));
  assert.equal(antipodes.direction, null);
});

test("units convert correctly without rounding short wrong guesses to zero", () => {
  assert.equal(formatDistance(160.9344, "mi"), "100 mi");
  assert.equal(formatDistance(0.3, "km"), "<1 km");
  assert.equal(formatDistance(0, "mi"), "0 mi");
});

test("duplicates and submissions after completion do not consume attempts", () => {
  const round = submitGuess(emptyRound, city("fr-lyon"), paris);
  assert.equal(submitGuess(round, city("fr-lyon"), paris), round);
  const won = submitGuess(round, paris, paris);
  assert.equal(won.status, "won");
  assert.equal(submitGuess(won, city("gb-london"), paris), won);
});

test("six wrong cities lose, but a correct sixth guess wins", () => {
  const wrong = ["fr-lyon", "gb-london", "jp-tokyo", "us-boston", "es-madrid", "au-sydney"];
  let round: Round = emptyRound;
  for (const id of wrong.slice(0, 5)) round = submitGuess(round, city(id), paris);
  assert.equal(round.status, "playing");
  assert.equal(submitGuess(round, paris, paris).status, "won");
  const lost = submitGuess(round, city(wrong[5]), paris);
  assert.equal(lost.status, "lost");
  assert.equal(submitGuess(lost, paris, paris), lost);
});
