import assert from "node:assert/strict";
import test from "node:test";
import { cities } from "../data/cities";
import { emptyRound, submitGuess, type Round } from "./game";
import { clearProgress, loadProgress, progressKey, restoreRound, saveProgress } from "./progress";

const city = (id: string) => cities.find((entry) => entry.id === id)!;
const puzzle = { id: "study-001", signature: "map-and-answer-v1", target: city("fr-paris") };
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
const record = (guessIds: unknown, overrides = {}) => JSON.stringify({
  version: 1, signature: puzzle.signature, guessIds, updatedAt: "2026-10-24T12:00:00Z", ...overrides,
});

test("restores ordered guesses and derives playing, won, and lost rounds", () => {
  const store = memoryStorage();
  let round = submitGuess(emptyRound, city("gb-london"), puzzle.target);
  assert.equal(saveProgress(() => store, puzzle, round), true);
  assert.deepEqual(loadProgress(() => store, puzzle, cities), { round, available: true });
  const saved = JSON.parse(store.getItem(progressKey(puzzle.id))!);
  assert.deepEqual(saved.guessIds, ["gb-london"]);
  assert.equal("status" in saved, false);
  assert.equal("guesses" in saved, false);
  round = submitGuess(round, puzzle.target, puzzle.target);
  saveProgress(() => store, puzzle, round);
  const restored = loadProgress(() => store, puzzle, cities).round;
  assert.equal(restored.status, "won");
  assert.equal(submitGuess(restored, city("jp-tokyo"), puzzle.target), restored);
  const wrong = ["fr-lyon", "gb-london", "jp-tokyo", "us-boston", "es-madrid", "au-sydney"];
  assert.equal(restoreRound(record(wrong), puzzle, cities)?.status, "lost");
  assert.equal(restoreRound(record([...wrong.slice(0, 5), "fr-paris"]), puzzle, cities)?.status, "won");
});

test("rejects malformed, stale, duplicate, unknown, and impossible histories", () => {
  const invalid = [
    "{", "null", "[]", "42", "{}", record("fr-paris"), record([null]),
    record(["missing-city"]), record(["gb-london", "gb-london"]),
    record(["fr-paris", "gb-london"]), record(Array(7).fill("gb-london")),
    record([], { version: 2 }), record([], { signature: "different-map-or-answer" }),
    record([], { updatedAt: "not-a-date" }), record([], { updatedAt: 123 }),
  ];
  for (const raw of invalid) assert.equal(restoreRound(raw, puzzle, cities), null, raw);
  assert.deepEqual(restoreRound(record([]), puzzle, cities), emptyRound);
});

test("switching and restarting isolate puzzle saves and preserve units", () => {
  const store = memoryStorage();
  const other = { ...puzzle, id: "study-006", target: city("us-boston") };
  const first = submitGuess(emptyRound, city("gb-london"), puzzle.target);
  const second = submitGuess(emptyRound, city("jp-tokyo"), other.target);
  store.setItem("streetprint-units", "mi");
  saveProgress(() => store, puzzle, first);
  saveProgress(() => store, other, second);
  assert.deepEqual(loadProgress(() => store, puzzle, cities).round, first);
  assert.equal(clearProgress(() => store, puzzle.id), true);
  assert.deepEqual(loadProgress(() => store, puzzle, cities).round, emptyRound);
  assert.deepEqual(loadProgress(() => store, other, cities).round, second);
  assert.equal(store.getItem("streetprint-units"), "mi");
});

test("missing saves are read without writing; invalid records are removed only for that puzzle", () => {
  const store = memoryStorage();
  assert.deepEqual(loadProgress(() => store, puzzle, cities), { round: emptyRound, available: true });
  assert.equal(store.values.size, 0);
  store.setItem(progressKey(puzzle.id), "bad json");
  store.setItem("unrelated", "keep");
  assert.deepEqual(loadProgress(() => store, puzzle, cities).round, emptyRound);
  assert.equal(store.getItem(progressKey(puzzle.id)), null);
  assert.equal(store.getItem("unrelated"), "keep");
});

test("map or answer revision resets progress while unchanged identity restores it", () => {
  const store = memoryStorage();
  const round = submitGuess(emptyRound, city("gb-london"), puzzle.target);
  saveProgress(() => store, puzzle, round);
  assert.deepEqual(loadProgress(() => store, { ...puzzle }, cities).round, round);
  assert.deepEqual(loadProgress(() => store, { ...puzzle, signature: "replacement-svg" }, cities).round, emptyRound);
  assert.equal(store.getItem(progressKey(puzzle.id)), null);
});

test("blocked storage getter, reads, quota errors, and failed deletion never break the game", () => {
  const fail = (): never => { throw new Error("Storage unavailable"); };
  const blocked = { getItem: fail, setItem: fail, removeItem: fail };
  for (const provider of [fail, () => blocked]) {
    assert.deepEqual(loadProgress(provider, puzzle, cities), { round: emptyRound, available: false });
    assert.equal(saveProgress(provider, puzzle, emptyRound), false);
    assert.equal(clearProgress(provider, puzzle.id), false);
  }
  const store = memoryStorage();
  store.setItem(progressKey(puzzle.id), "bad");
  assert.equal(loadProgress(() => ({ ...store, removeItem: fail }), puzzle, cities).available, false);
  let round: Round = emptyRound;
  round = submitGuess(round, city("gb-london"), puzzle.target);
  assert.equal(saveProgress(() => ({ ...store, setItem: fail }), puzzle, round), false);
  assert.equal(round.guesses.length, 1);
});
