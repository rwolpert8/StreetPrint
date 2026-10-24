# Generate StreetPrint puzzles yourself

These commands run locally. They do not call Codex or an AI API and do not use
your Codex usage allowance. New maps download public OpenStreetMap data; the
game itself serves saved SVGs and needs no map API key.

## Your normal workflow

Open PowerShell in the StreetPrint project folder. Your existing `.venv` is
already set up on this computer. The only authoring file you need is
[`puzzles.json`](../puzzles.json).

1. Copy a puzzle entry in `puzzles.json`, give it a new ID (such as `study-007`),
   update its city and map details, and start with `"enabled": false`.
   A disabled **Boston / study-006** example is already included for your first run.
2. Check the file and generate just that puzzle:

   ```powershell
   npm run puzzles:check
   npm run puzzles:generate -- study-006
   ```

3. Open the generated review page:

   ```powershell
   Start-Process output/puzzles/study-006.html
   ```

4. Inspect the map at desktop and narrow window sizes. Check the water, streets,
   framing, and whether the pattern makes a reasonable puzzle. Adjust `map.center`
   if needed, then rerun generation. Keep `widthM: 6000` for comparable scale.
5. When you are happy, change `"enabled": false` to `"enabled": true`, then:

   ```powershell
   npm run assets
   npm run dev
   ```

   If the dev server is already running, only run `npm run assets` and refresh
   the browser. The puzzle and its answer city join the game automatically.
   No TypeScript or asset-copy list needs editing. In production, rebuild/deploy
   when you are ready; enabling a puzzle locally does not deploy anything.

Use `npm run puzzles:list` to see all IDs, draft/enabled states, and which maps
need generation. `puzzles:check` validates every definition but requires maps
only for enabled puzzles. Adding a draft will not break the current game.

## What to put in the definition

The file has `"schemaVersion": 1` and a `"puzzles"` array. Each puzzle looks like:

```json
{
  "id": "study-006",
  "enabled": false,
  "city": {
    "id": "us-boston",
    "name": "Boston",
    "country": "United States",
    "countryCode": "us",
    "continent": "North America",
    "latitude": 42.3601,
    "longitude": -71.0589,
    "aliases": []
  },
  "map": {
    "center": [42.3601, -71.0589],
    "widthM": 6000,
    "coastline": true
  },
  "reveal": "Boston’s Back Bay really was a bay. Much of the neighborhood stands on former tidal water that was filled in during the 1800s."
}
```

- **id:** unique puzzle number, `study-006` or higher. Keep existing IDs stable.
- **enabled:** whether the puzzle appears in the game. Generate and review first.
- **city.id:** stable city identifier, such as `us-boston`. Use the same ID when
  another puzzle shows the same city; use different IDs for different cities
  with the same name. Existing guessable cities are listed in `src/data/cities.ts`.
- **city.name / country:** text displayed in search and the answer.
- **city.countryCode:** lowercase two-letter ISO country code, used for flags and
  country feedback, such as `us`, `fr`, `jp`, or `au`.
- **city.continent:** exactly `Africa`, `Asia`, `Europe`, `North America`,
  `South America`, or `Oceania`. This determines continent feedback.
- **city.latitude / longitude:** the city's reference point for distance and
  direction clues. Choose and verify it deliberately.
- **city.aliases:** alternative names such as `["NYC", "New York"]`; use `[]`
  when there are none. Optional `city.region` helps distinguish same-name cities.
- **map.center:** `[latitude, longitude]` of the map crop. This can differ from
  the city reference point—for example, our NYC crop focuses on Midtown.
- **map.widthM:** square width in metres. Use `6000` to match the current puzzles;
  the supported range is 1000–20000. The game's scale caption follows this value.
- **map.coastline:** `true` adds coastal fill where coastline crosses the crop.
  Use it for coastal cities. Inland water is always requested either way.
- **reveal:** a short, fact-checked city fun fact, displayed under **Did you know?** after a win or loss. Write only the fact; the game adds the heading. Keep the source in [CITY-FACTS.md](CITY-FACTS.md) so it is easy to check later. Editing this text does not require regenerating the map and does not reset saved progress.

JSON needs double quotes and commas between entries, with no trailing comma
after the last entry. It does not accept comments. Latitude comes first in
`map.center`; southern latitudes and western longitudes are negative.

If you create multiple crops of one city, copy identical `city` details into each
entry and change only the puzzle ID, map, and reveal. Conflicting city definitions
are rejected. An enabled puzzle city overrides a matching extra search entry.

## Files and regeneration

Generation produces these files in `output/puzzles/`:

- `study-006.svg`: the map, with attribution but no city name inside it.
- `study-006.json`: generation record used to detect outdated map settings.
- `study-006.html`: a local review page that intentionally reveals the city.

Commit `puzzles.json` and generated SVG/JSON/HTML files when saving your work.
The first five maps were imported from the earlier experiments; their old
galleries remain available. Their new review HTML is created on regeneration.
`public/puzzles/` contains disposable frontend copies and is ignored by Git.
Do not hand-edit SVGs or generation records. New definitions use only
`output/puzzles/`; `experiments/cities.json` remains for the old comparison tools.

Editing the city description, aliases, reference coordinates, or reveal does
not require redrawing the map. Editing its centre, width, or coastline option
does: the asset check will tell you which generation command to run. After
editing an enabled puzzle, regenerate before running `npm run assets` or building.
While editing with a dev server running, refresh after generation and asset copying.

To reuse a downloaded street graph:

```powershell
npm run puzzles:generate -- study-006 --reuse-graph
```

The new workflow keys saved graphs by puzzle ID, centre, and width, so a changed
crop cannot accidentally reuse the old graph. It downloads a graph when no match
exists. Water requests also use OSMnx's cache. Reusing files does not guarantee
fresh OSM data: generation time is not the source data's snapshot date.

## Troubleshooting

- **Busy server, timeout, or HTTP 502:** wait, then rerun the same command. The
  script requests one city at a time and retains existing outputs if downloading
  fails. An alternate public endpoint can be selected explicitly:

  ```powershell
  npm run puzzles:generate -- study-006 --reuse-graph --overpass-url https://overpass.private.coffee/api
  ```

  Alternate servers can also be unavailable. Avoid repeatedly launching jobs
  in parallel; downloaded responses are cached separately per endpoint.
- **No mapped water:** generation continues with streets only and prints a
  notice. Check whether the crop should contain water; this is not proof that
  real-world water is absent. Other API errors still stop generation.
- **Incomplete coastline:** inspect the crop/data rather than accepting a guessed
  fill. Try adjusting the crop. Turning coastline off can help diagnose the
  issue but may omit the sea. Fully offshore crops are not supported by the
  local coastline approach.
- **Missing/stale map:** follow the exact `puzzles:generate` command in the error,
  or disable that draft until you are ready to include it.
- **Duplicate or invalid definition:** `npm run puzzles:check` reports the ID and
  offending field. This runs locally without downloading any map data.

## Setup on another computer

Install Node.js 22+ and Python (the existing dependency lock was made with Python
3.13 on Windows), then run from the repository folder:

```powershell
npm ci
python -m venv .venv
python -m pip --python .venv/Scripts/python.exe install -r requirements-lock.txt
```

The generation command uses `.venv/Scripts/python.exe` on Windows and
`.venv/bin/python` on macOS/Linux. Commands above are written for PowerShell.
For frontend-only use, `npm ci` and `npm run dev` are enough; Python is needed
only when generating new maps.
