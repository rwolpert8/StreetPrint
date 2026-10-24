import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

export const root = new URL("../", import.meta.url);
export const renderVersion = 1;
const continents = new Set(["Africa", "Asia", "Europe", "North America", "South America", "Oceania"]);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value) => typeof value === "string" && value.trim().length > 0;
const coordinate = (value, limit) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

// Shared by generation and asset preparation: invalid drafts fail before any downloads.
export function validateDefinitions(data) {
  check(data?.schemaVersion === 1 && Array.isArray(data.puzzles), "puzzles.json must have schemaVersion: 1 and a puzzles array.");
  const ids = new Set();
  const cities = new Map();
  for (const puzzle of data.puzzles) {
    const label = puzzle?.id ?? "Unnamed puzzle";
    check(/^study-\d{3,}$/.test(puzzle?.id), `${label}: id must look like study-006.`);
    check(!ids.has(puzzle.id), `${label}: duplicate puzzle ID.`);
    ids.add(puzzle.id);
    check(typeof puzzle.enabled === "boolean", `${label}: enabled must be true or false.`);
    const city = puzzle.city;
    check(city && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city.id), `${label}: city.id must be a lowercase ID such as us-boston.`);
    check(text(city.name) && text(city.country), `${label}: city name and country are required.`);
    check(/^[a-z]{2}$/.test(city.countryCode), `${label}: countryCode must be two lowercase letters, such as us.`);
    check(continents.has(city.continent), `${label}: continent must be one of ${[...continents].join(", ")}.`);
    check(coordinate(city.latitude, 90) && coordinate(city.longitude, 180), `${label}: city coordinates must be valid latitude/longitude numbers.`);
    check(city.region === undefined || text(city.region), `${label}: region must be nonempty text when provided.`);
    check(Array.isArray(city.aliases) && city.aliases.every(text), `${label}: aliases must be an array of names (or []).`);
    check(!cities.has(city.id) || isDeepStrictEqual(cities.get(city.id), city), `${label}: conflicting definitions for city ${city.id}. Copy the same city details for another crop.`);
    cities.set(city.id, city);
    const map = puzzle.map;
    check(map && Array.isArray(map.center) && map.center.length === 2 && coordinate(map.center[0], 90) && coordinate(map.center[1], 180), `${label}: map.center must be [latitude, longitude].`);
    check(Number.isInteger(map.widthM) && map.widthM >= 1000 && map.widthM <= 20000, `${label}: map.widthM must be an integer from 1000 to 20000.`);
    check(typeof map.coastline === "boolean", `${label}: map.coastline must be true or false.`);
    check(text(puzzle.reveal), `${label}: reveal text is required.`);
  }
  return data.puzzles;
}

export async function readDefinitions() {
  let data;
  try { data = JSON.parse(await readFile(new URL("puzzles.json", root), "utf8")); }
  catch (error) { throw new Error(`Cannot read puzzles.json: ${error.message}`); }
  return validateDefinitions(data);
}

export async function readPuzzleAsset(puzzle, base = root) {
  const command = `npm run puzzles:generate -- ${puzzle.id}`;
  let receipt, svg;
  try {
    receipt = JSON.parse(await readFile(new URL(`output/puzzles/${puzzle.id}.json`, base), "utf8"));
    svg = await readFile(new URL(`output/puzzles/${puzzle.id}.svg`, base), "utf8");
  } catch { throw new Error(`${puzzle.id}: map or generation record is missing. Run: ${command}`); }
  check(receipt.id === puzzle.id && receipt.renderVersion === renderVersion && isDeepStrictEqual(receipt.map, puzzle.map),
    `${puzzle.id}: map settings changed since generation. Run: ${command}`);
  check(svg.includes("<svg") && svg.includes("</svg>"), `${puzzle.id}: invalid SVG. Run: ${command}`);
  return svg;
}
