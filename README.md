# StreetPrint

A daily city-guessing game, starting with an offline map experiment.

## Frontend preview

The Next.js prototype has five playable puzzles: Paris (001), Tokyo (002),
NYC (003), Barcelona (004), and Sydney (005), with light-blue water,
map zoom, city autocomplete, and six guesses. Select a city, then press
**Submit guess** (or press Enter again after selecting). Feedback is red for a
different continent, yellow for the same continent but a different country, blue
for the same country but a different city, and green for the correct city.
Each result also has a text label, so color is never the only clue.

Incorrect guesses show approximate great-circle distance and an eight-point
compass direction from the guess toward the answer. The km/mi toggle updates all
history and remembers the unit preference locally. Duplicate guesses do not
consume attempts. A correct guess or six incorrect guesses ends the round and
reveals the city; Play again restarts the same practice puzzle.

The centered **How to play** dialog explains the rules and supports Escape,
focus trapping, and scrolling on small screens. The blue theme uses white map
and panel surfaces with a few geography emojis. The demo opens on puzzle 003.
Use the numbered practice selector to switch maps without showing the city names.
Switching resets guesses and map zoom. These are fixed practice puzzles,
not a scheduled daily game. **Round progress currently resets on refresh**;
only the unit preference is saved.

With Node.js 22+ and npm installed, run these commands from the repository root:

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Next.js (normally `http://127.0.0.1:3000`).
No API keys or Python installation are needed to run the frontend. Before dev
and production builds, `scripts/prepare-assets.mjs` copies all five SVGs
from `output/6000m-streets-water/` to `public/puzzles/study-001.svg` through
`study-005.svg`, changing their cream backgrounds to white to match the UI.
The source maps stay in the offline experiment outputs. Don't hand-edit the copies.

```powershell
npm test          # Search, geographic clues, feedback rules, and round transitions
npm run typecheck # TypeScript checks
npm run build     # Production build
npm start         # Serve that production build
```

### Where to read the frontend code

- `src/app/page.tsx` composes the page; `globals.css` sets the visual style.
- `src/components/practice-game.tsx` selects the puzzle and resets both panels when it changes.
- `src/components/puzzle-map.tsx` displays and zooms the static SVG.
- `src/components/city-search.tsx` handles typing, keyboard navigation, and selection.
- `src/components/game-round.tsx` handles submission, history, units, and round results.
- `src/components/how-to-play.tsx` renders the centered instructions dialog.
- `src/lib/game.ts` contains the independently tested distance/bearing calculations,
  feedback hierarchy, and round transitions; `src/data/puzzle.ts` defines the five practice puzzles.
- `src/lib/city-search.ts` contains the UI-independent matching and ranking logic.
- `src/data/cities.ts` holds 44 manually curated cities, independent of puzzle answers.
  It includes countries, continents, aliases, and approximate reference coordinates.
  This small catalogue is for interaction testing, not complete worldwide coverage;
  distances use these approximate city anchors. Review them before public launch.

Search ignores letter case and accents and supports aliases such as `NYC`,
`Munchen`, and `東京`. City IDs distinguish Paris, France from Paris, Texas.
Country flags are bundled locally through the MIT-licensed `flag-icons` package;
there are no third-party requests while typing. System fonts also work offline.

Daily puzzle selection, saved round progress, sharing, and a larger city catalogue
remain later work. Puzzle answers are currently
included in the client bundle; this prototype does not prevent answer inspection.

## First experiment

Generate unlabeled central-city road networks for NYC, Paris, Barcelona, Tokyo,
and Sydney. All images cover **6 × 6 km**, use the same stroke width, and orient
north upwards at the centre. Centres are explicit editorial choices in
[`experiments/cities.json`](experiments/cities.json), not authoritative city centroids.

### Run (PowerShell)

```powershell
python -m venv .venv
python -m pip --python .venv/Scripts/python.exe install -r requirements.txt
.\.venv\Scripts\python.exe experiments/generate.py
Start-Process output/6000m-drive/index.html
```

If Windows Python fails during `ensurepip`, but `.venv/Scripts/python.exe` exists,
the second command can install into that environment using your existing pip.
Downloads require internet access to PyPI and the public Overpass API. Generation
is sequential to avoid sending a burst of requests to a shared service. Reruns
reuse OSMnx's HTTP cache. If a download fails, rerun the command; already-written
SVGs remain available.

If the default server is at capacity, use an alternate public endpoint, for example
`--overpass-url https://overpass.private.coffee/api`. Keep requests sequential.
The selected endpoint is recorded in new manifest entries; OSMnx caches responses
separately for each endpoint.
Use `--reuse-graph` to reuse a saved graph for the same city, width, and network
type while refining water or drawing settings. Only do this if the crop centre
in `experiments/cities.json` has not changed; saved graph filenames do not encode
the centre. If no matching graph is saved, the generator downloads it normally.

Change one variable at a time:

```powershell
.\.venv\Scripts\python.exe experiments/generate.py --city tokyo --width-m 8000
.\.venv\Scripts\python.exe experiments/generate.py --city paris --network-type all_public
.\.venv\Scripts\python.exe experiments/generate.py --city paris --network-type all_public --water
.\.venv\Scripts\python.exe experiments/generate.py --city paris --network-type all_public --streets-only --water
.\.venv\Scripts\python.exe experiments/generate.py --city barcelona --network-type all_public --streets-only
.\.venv\Scripts\python.exe experiments/generate.py --city nyc --network-type all_public --streets-only --water --coastline
.\.venv\Scripts\python.exe experiments/generate.py --city barcelona --network-type all_public --streets-only --water --coastline
.\.venv\Scripts\python.exe experiments/generate.py --city sydney --network-type all_public --streets-only --water --coastline
```

Outputs go into separate folders for each width/filter combination. Each folder
has SVGs, a review-only HTML gallery, and a manifest containing centres, projection,
generation time, and settings. GraphML intermediates and downloaded responses are
ignored by Git. Keep them if you need to reproduce the exact source geometry:
live OpenStreetMap data changes, and generation time is not a data snapshot date.
`requirements-lock.txt` records the complete dependency versions installed for
this experiment (Windows, Python 3.13). Use it instead of `requirements.txt` to
recreate this environment more closely.

### Investigating gaps and the Seine

The original `drive` preset is a routing filter, not a complete drawing of the
city's street fabric: it excludes pedestrian streets, service roads, paths, and
ways tagged as closed to motor vehicles. A road can appear to end where its
access rules change. `all_public` includes those public connections, at the cost
of also drawing sidewalks, cycleways, park paths, and other small features.
We preserve both versions so this tradeoff can be judged visually.

`--streets-only` selects road classes, living streets, pedestrian streets, and
service lanes from the `all_public` graph. It excludes separately mapped paths,
sidewalks, cycleways, steps, and indoor corridors. This drawing is stored under
`output/6000m-streets/` (or `6000m-streets-water/`). The exact allowlist is
`STREET_TYPES` in the generator. Simplified edges with mixed tags are retained
if any of their highway tags is a street class.

`--water` adds a separate polygon layer beneath the streets, stored in a separate
output folder such as `output/6000m-all_public-water/`. It queries OSM's
`natural=water` and legacy `waterway=riverbank` features, clips them to the same
frame, and preserves islands using SVG's even-odd fill rule. It does **not**
infer rivers from gaps between roads or connect street endpoints artificially.
Bridges and tunnels retain their original road styling above this layer.

Add `--coastline` alongside `--water` to fill coastal water, as used for NYC,
Barcelona, and Sydney. The generator closes mapped coastline segments against
the square frame and fills their water side, following OSM's convention that
land is on the left and water on the right. Islands remain dry; inland water
is then combined with the coastal fill. The manifest records this option.

This is a local-crop approach, not a worldwide ocean dataset. If there is no
coastline inside the frame, only mapped water polygons are drawn (these already
cover Sydney Harbour). Broken coastline segments are rejected rather than
closed by guessing. A completely offshore crop needs a different approach.
Some road gaps can still be real dead ends, private areas, or incomplete OSM mapping.
Offline checks for coastal direction, islands, joined shores, and broken segments:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s experiments -p 'test_*.py'
```

After generating the Paris and Barcelona variants above, run
`.\.venv\Scripts\python.exe experiments/compare.py` and open
`output/street-refinement/index.html` for the before/after comparison.
The revised street filter restores the conspicuous old-town gaps in Barcelona;
the optional water fill makes the Seine easier to follow in Paris. All comparisons
retain the original centres, scale, orientation, and line width.

## How the code works

Read `experiments/generate.py` in this order:

1. **`local_crs`** defines a city-centred azimuthal equidistant projection. Its
   coordinates are metres, with north up at the centre. Over these small extents,
   distortion is very small; no flat map preserves every distance perfectly.
2. **`load_streets`** converts a buffered square into latitude/longitude, downloads
   its network, projects the graph into metres, and clips actual road geometry to
   the exact square. The extra 500 m reduces boundary truncation artifacts.
   `retain_all=True` keeps disconnected components. Converting to an undirected
   graph avoids drawing both travel directions over the same physical road.
3. **`svg_document`** maps metre coordinates into a 1,000-unit SVG. It flips the
   vertical axis because SVG coordinates increase downward. Road curves are
   preserved; graph simplification removes intermediate graph nodes, not bends.
4. **`main`** loops over city definitions and writes the artifacts. The gallery
   is only a way to review this experiment, not the game UI.

## Decisions to evaluate before building the game

- **Coverage:** start at 6 km for every city. Compare 8 km if the crop is too local;
  avoid fitting each city independently, which would break the equal-scale rule.
- **Road filter:** `drive` is a legible baseline, but omits pedestrian-only
  streets. `all_public` adds public paths and can become visually dense. Apply the
  same rule to all cities once we choose it.
- **Line style:** uniform widths emphasize street patterns. OSM represents some
  divided roads as separate ways; this experiment does not merge carriageways.
  Bridges and tunnels are both included, with the same style as surface streets.
  Tunnels can therefore appear as lines crossing otherwise empty river areas.
- **Centre:** move a centre only deliberately. NYC currently emphasizes Midtown;
  that is a different puzzle from lower Manhattan or all five boroughs.
- **Empty space:** water, parks, rail yards, and omitted road types can all create
  gaps. The original diagrams have no water layer; the optional inland-water
  experiment distinguishes mapped water from other gaps.

For each image, inspect it at roughly 360 px and 800 px: can you read the streets,
is there a distinctive pattern, and does the crop feel informative? Try guessing
without reading the gallery heading. Familiarity with these five cities will not
establish general puzzle difficulty; later playtesting should use unseen cities.

## Architecture boundary

Keep Python as an **offline asset pipeline**. A future Next.js app can serve these
SVGs and read curated puzzle JSON without running Python or contacting Overpass
during play. MapLibre will handle the guessing map, not the street diagrams.
The proposed frontend stack can wait until the diagrams work well.

The experiment's city-named files and manifest expose answers intentionally.
Future public assets should use puzzle IDs and omit answer-bearing SVG metadata.
Static answer JSON is still inspectable by a determined player; that's a reasonable
MVP tradeoff, not cheat prevention. Store the scoring coordinate separately from
the visual crop centre if we later decide guesses should target a city landmark.

## Sources and attribution

- [OSMnx API documentation](https://osmnx.readthedocs.io/en/stable/user-reference.html)
- [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright)
- [OpenStreetMap coastline direction convention](https://wiki.openstreetmap.org/wiki/Tag:natural=coastline)

Map data © OpenStreetMap contributors, available under the ODbL. The repository's
MIT license covers code, not the underlying OSM data. The preview displays linked
attribution; SVG metadata also includes it. Any future game must display attribution
visibly near the maps, and standalone exported images should carry visible attribution.
