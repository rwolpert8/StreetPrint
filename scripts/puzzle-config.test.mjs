import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { readDefinitions, validateDefinitions, validateCatalogueReferences, readPuzzleAsset } from "./puzzle-config.mjs";

const definitions = await readDefinitions();
const sample = () => ({ schemaVersion: 1, puzzles: [structuredClone(definitions[0])] });

test("definitions reject invalid input before generation", () => {
  for (const mutate of [
    (p) => { p.id = "../../outside"; },
    (p) => { p.enabled = "false"; },
    (p) => { p.map.center = [100, 0]; },
    (p) => { p.map.widthM = 500; },
    (p) => { p.city.continent = "Unknown"; },
    (p) => { p.city.longitude = 181; },
    (p) => { p.city.countryCode = "USA"; },
  ]) {
    const data = sample(); mutate(data.puzzles[0]);
    assert.throws(() => validateDefinitions(data));
  }
});

test("duplicate puzzle IDs and conflicting city records are rejected", () => {
  const data = sample();
  data.puzzles.push(structuredClone(data.puzzles[0]));
  assert.throws(() => validateDefinitions(data), /duplicate/);
  data.puzzles[1].id = "study-999";
  assert.equal(validateDefinitions(data).length, 2); // Two crops of one city are allowed.
  data.puzzles[1].city.latitude += 1;
  assert.throws(() => validateDefinitions(data), /conflicting/);
});

test("every puzzle, including drafts, needs exactly two nonempty clues", () => {
  for (const hints of [undefined, null, "one clue", [], ["one"], ["one", "two", "three"], ["one", "   "], ["one", 2]]) {
    const data = sample();
    data.puzzles[0].enabled = false;
    data.puzzles[0].hints = hints;
    assert.throws(() => validateDefinitions(data), /hints must contain two/);
  }
});

test("asset checks detect absent or stale maps but allow editorial changes", async () => {
  const folder = await mkdtemp(join(tmpdir(), "streetprint-test-"));
  const base = pathToFileURL(folder + "/");
  const puzzle = sample().puzzles[0];
  try {
    await assert.rejects(readPuzzleAsset(puzzle, base), /missing/);
    await mkdir(join(folder, "output/puzzles"), { recursive: true });
    await writeFile(join(folder, `output/puzzles/${puzzle.id}.svg`), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await writeFile(join(folder, `output/puzzles/${puzzle.id}.json`), JSON.stringify({ id: puzzle.id, map: puzzle.map, renderVersion: 1 }));
    puzzle.reveal = "Updated editorial information.";
    puzzle.hints = ["A new broad clue.", "A new specific clue."];
    assert.match(await readPuzzleAsset(puzzle, base), /<svg/);
    puzzle.map.center[0] += 0.01;
    await assert.rejects(readPuzzleAsset(puzzle, base), /settings changed/);
  } finally {
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    assert.ok(basename(folder).startsWith("streetprint-test-"));
    await rm(folder, { recursive: true, force: true });
  }
});

test("enabled puzzle maps are ready, drafts do not need assets", async () => {
  for (const puzzle of definitions.filter((p) => p.enabled)) assert.match(await readPuzzleAsset(puzzle), /<svg/);
  assert.equal(validateDefinitions({ schemaVersion: 1, puzzles: [] }).length, 0);
});

test("puzzle answers reuse imported IDs rather than creating duplicate correct cities", () => {
  const puzzle = sample().puzzles[0];
  const { city } = puzzle;
  const catalogue = { cities: [[city.id, city.name, city.countryCode, "", city.latitude, city.longitude, 100000, city.aliases, 1]] };
  assert.doesNotThrow(() => validateCatalogueReferences([puzzle], catalogue));
  city.id = "new-paris";
  assert.throws(() => validateCatalogueReferences([puzzle], catalogue), /already exist/);
  city.latitude = 0; // A different, distant place with the same name is allowed.
  assert.doesNotThrow(() => validateCatalogueReferences([puzzle], catalogue));
  city.id = "geonames-unknown";
  assert.throws(() => validateCatalogueReferences([puzzle], catalogue), /unknown catalogue ID/);
  city.id = catalogue.cities[0][0];
  city.countryCode = "us";
  assert.throws(() => validateCatalogueReferences([puzzle], catalogue), /different country/);
});
