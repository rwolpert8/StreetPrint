# Guessable city catalogue

StreetPrint includes a checked-in GeoNames snapshot with **11,609 cities**, independent
of which cities have puzzles. Search and saved-progress restoration work locally;
there are no GeoNames requests during gameplay, development startup, or builds.

## Coverage and search

The import starts with GeoNames `cities15000.zip`, then selects populated places
with a recorded population of at least 50,000, national capitals (`PPLC`), and
every city from the original StreetPrint catalogue. Explicitly tagged city
sections (`PPLX`), historical places, and abandoned settlements are excluded.
Source classifications and population estimates vary, so this is a practical
guess list, not a definitive list of municipalities. Smaller towns can be absent.

Names and alternate names support accents, transliterations, and non-Latin scripts.
Add a region or country after the name to narrow results, for example
`London Ontario`, `Portland ME`, or `NYC USA`. Exact display names come first,
then exact aliases, name prefixes, alias prefixes, and substring matches.
Within each group, larger recorded populations rank first; puzzle answers get
no ranking boost. Region labels distinguish same-name cities. Population only
affects ranking and is not shown as a current demographic fact.

The snapshot is roughly 3.5 MiB before compression. It ships with the game, and
the search index is normalized once per page load. Query results are memoized
in the input so moving through suggestions does not repeat the search.

## Choose a city for a new puzzle

```powershell
npm run cities:find -- "Washington United States"
```

This prints up to eight matching `city` objects. Copy the correct object into
your puzzle definition, retaining its **id**. Imported cities normally use
`geonames-<numeric ID>`; existing StreetPrint cities retain IDs such as `fr-paris`.
Do not invent another ID for a city already in the catalogue: guessing the
imported version must count as the correct answer. The puzzle validator rejects
unknown `geonames-` IDs and flags likely nearby duplicates with different IDs.

You may adjust the puzzle's reference coordinates and display details deliberately.
Imported population and aliases are retained when puzzle details override the
catalogue entry. The lookup prints `aliases: []` because imported aliases do not
need to be copied into every puzzle. Add any extra aliases you want there.

If the city is genuinely absent, add it manually in `puzzles.json` with a unique
ID as before. Enabling its puzzle adds it to search. A catalogue refresh that
later imports this city should pin its existing ID in `data/city-overrides.json`
before regenerating, so it does not become two guesses.

## Refresh the snapshot

The importer uses Python's standard library only. It does not need OSMnx or an API key.
From the project root on Windows:

```powershell
.\.venv\Scripts\python.exe scripts/import-cities.py --download
```

On other systems, use `python3 scripts/import-cities.py --download`. Omit
`--download` to rebuild from the same files cached in `data/cache/geonames/`.
Review the generated changes before committing. Normal npm commands never refresh
the dataset automatically.

- `src/data/city-catalogue.json`: compact catalogue; one city per line.
- `data/city-overrides.json`: reviewed GeoNames IDs mapped to the original game
  IDs, display names, scoring coordinates, and extra aliases. Do not rename these
  IDs casually: saved guesses refer to them. Missing pinned records stop import.
- `data/city-catalogue-source.json`: source URLs, generation time, SHA-256 hashes,
  selection policy, and counts. Generation time is not the date of every source record.
- `data/cache/geonames/`: downloaded source files, ignored by Git.

City rows are `[id, name, countryCode, regionKey, latitude, longitude, population,
aliases, geonameId]`. Country and region dictionaries avoid repeated strings.
The runtime expands these rows into the existing `City` shape.

After a refresh, run:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s scripts -p "test_import_cities.py"
npm test
npm run typecheck
npm run build
```

New imported cities use stable GeoNames IDs. Existing StreetPrint scoring coordinates
are pinned so this expansion does not change old feedback. Future source deletions
or editorial changes still need review: removing a guessed city can invalidate a save.

## Attribution and sources

City data is adapted from [GeoNames](https://www.geonames.org/), licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
StreetPrint filters records, compacts fields, deduplicates aliases, and applies
the documented overrides. Attribution is also visible in the game's footer.
This data has its own license; the repository's MIT license covers its code.

- [Dataset schema, coverage, and license](https://download.geonames.org/export/dump/readme.txt)
- [Cities source](https://download.geonames.org/export/dump/cities15000.zip)
- [Country and continent data](https://download.geonames.org/export/dump/countryInfo.txt)
- [Region names](https://download.geonames.org/export/dump/admin1CodesASCII.txt)
- [Feature-code definitions](https://www.geonames.org/export/codes.html)
