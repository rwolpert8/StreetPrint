"""Build the checked-in guess catalogue from GeoNames, using only Python's stdlib."""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import unicodedata
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data/cache/geonames"
DESTINATION = ROOT / "src/data/city-catalogue.json"
SOURCE = "https://download.geonames.org/export/dump/"
FILES = ("cities15000.zip", "countryInfo.txt", "admin1CodesASCII.txt")
CONTINENTS = {"AF": "Africa", "AS": "Asia", "EU": "Europe", "NA": "North America",
              "SA": "South America", "OC": "Oceania"}
# Exclude explicitly tagged neighborhoods, historical/abandoned settlements, etc.
PLACE_TYPES = {"PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLA5", "PPLC", "PPLG"}


def normalize(value):
    return " ".join("".join(char for char in unicodedata.normalize("NFD", value)
                            if not unicodedata.combining(char)).casefold().split())


def aliases_for(name, values):
    seen = {normalize(name)}
    aliases = []
    for value in values:
        value = value.strip()
        key = normalize(value)
        if key and key not in seen:
            aliases.append(value)
            seen.add(key)
    return aliases


def build_catalogue(rows, countries, regions, overrides):
    pinned = {str(city["geonameId"]): city for city in overrides}
    if len(pinned) != len(overrides) or len({city["id"] for city in overrides}) != len(overrides):
        raise ValueError("City overrides must have unique GeoNames IDs and game IDs.")
    cities, used_countries, used_regions, seen = [], set(), set(), set()
    for row in rows:
        if len(row) != 19:
            raise ValueError("Unexpected GeoNames row format.")
        gid, name, ascii_name, aliases, lat, lon, feature_class, feature, country = row[:9]
        override = pinned.get(gid, {})
        if feature_class != "P" or feature not in PLACE_TYPES:
            continue
        population = int(row[14])
        if population < 50000 and feature != "PPLC" and not override:
            continue
        if country not in countries or countries[country][1] not in CONTINENTS.values():
            continue
        if gid in seen:
            raise ValueError(f"Duplicate GeoNames ID: {gid}")
        seen.add(gid)
        if override and override["countryCode"] != country.lower():
            raise ValueError(f"Country changed for pinned city {gid}; review the source.")
        latitude = override.get("latitude", float(lat))
        longitude = override.get("longitude", float(lon))
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            raise ValueError(f"Invalid coordinates for {gid}")
        region_key = f"{country}.{row[10]}"
        region = regions.get(region_key, "")
        if override.get("region"):
            region = override["region"]
        if region:
            regions[region_key] = region
            used_regions.add(region_key)
        else:
            region_key = ""
        display_name = override.get("name", name)
        names = aliases_for(display_name, [*override.get("aliases", []), name, ascii_name, *aliases.split(",")])
        cities.append([override.get("id", f"geonames-{gid}"), display_name, country.lower(),
                       region_key, latitude, longitude, population, names, int(gid)])
        used_countries.add(country)
    missing = set(pinned) - seen
    if missing:
        raise ValueError(f"Pinned cities missing from source: {sorted(missing)}")
    cities.sort(key=lambda city: city[8])
    return {
        "schemaVersion": 1,
        "countries": {code.lower(): countries[code] for code in sorted(used_countries)},
        "regions": {key: regions[key] for key in sorted(used_regions)},
        "cities": cities,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Refresh the three public GeoNames source files.")
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    if args.download:
        for filename in FILES:
            print(f"Downloading {filename}...", flush=True)
            with urlopen(SOURCE + filename, timeout=120) as response:
                payload = response.read()
            temporary = CACHE / (filename + ".tmp")
            temporary.write_bytes(payload)
            temporary.replace(CACHE / filename)
    if any(not (CACHE / filename).exists() for filename in FILES):
        parser.error("Source files are missing. Run again with --download.")
    countries = {}
    for line in (CACHE / "countryInfo.txt").read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        fields = line.split("\t")
        countries[fields[0]] = [fields[4], CONTINENTS.get(fields[8], "Antarctica"), fields[1]]
    regions = {fields[0]: fields[1] for line in (CACHE / "admin1CodesASCII.txt").read_text(encoding="utf-8").splitlines()
               if (fields := line.split("\t")) and len(fields) >= 4}
    overrides = json.loads((ROOT / "data/city-overrides.json").read_text(encoding="utf-8"))
    with ZipFile(CACHE / "cities15000.zip") as archive:
        rows = [line.split("\t") for line in archive.read("cities15000.txt").decode("utf-8").splitlines()]
    catalogue = build_catalogue(rows, countries, regions, overrides)
    if len(catalogue["cities"]) < 10000:
        raise ValueError("Unexpectedly small catalogue; refusing to replace the existing snapshot.")
    # Compact rows keep the browser payload small; one city per line keeps diffs reviewable.
    header = {key: value for key, value in catalogue.items() if key != "cities"}
    serialized = json.dumps(header, ensure_ascii=False, separators=(",", ":"))[:-1]
    serialized += ',"cities":[\n' + ',\n'.join(json.dumps(city, ensure_ascii=False, separators=(",", ":"))
                                              for city in catalogue["cities"]) + '\n]}\n'
    temporary = DESTINATION.with_suffix(".json.tmp")
    temporary.write_text(serialized, encoding="utf-8")
    temporary.replace(DESTINATION)
    metadata = {
        "source": SOURCE, "license": "CC BY 4.0", "generatedAt": datetime.now(timezone.utc).isoformat(),
        "selection": "Population >= 50000 or PPLC national capital, plus pinned existing cities; populated-place types only.",
        "count": len(catalogue["cities"]),
        "continents": dict(sorted(Counter(catalogue["countries"][city[2]][1] for city in catalogue["cities"]).items())),
        "sourceSha256": {filename: hashlib.sha256((CACHE / filename).read_bytes()).hexdigest() for filename in FILES},
        "catalogueSha256": hashlib.sha256(DESTINATION.read_bytes()).hexdigest(),
    }
    (ROOT / "data/city-catalogue-source.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {metadata['count']:,} cities ({DESTINATION.stat().st_size / 1024 / 1024:.2f} MiB).")


if __name__ == "__main__":
    main()
