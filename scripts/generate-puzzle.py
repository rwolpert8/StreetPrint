"""Called by npm run puzzles:generate; receives one validated definition on stdin."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "experiments"))
import osmnx as ox
from generate import load_streets, load_water, svg_document, ATTRIBUTION


def generate_puzzle(puzzle, render_version, reuse_graph=False, output=None):
    settings = puzzle["map"]
    # The cache key includes the crop, so changing its centre cannot reuse the old graph.
    geometry_key = sha256(json.dumps([settings["center"], settings["widthM"]]).encode()).hexdigest()[:16]
    city = {"id": f"{puzzle['id']}-{geometry_key}", "center": settings["center"]}
    print(f"Generating {puzzle['id']}: {puzzle['city']['name']} ({settings['widthM']} m square)...", flush=True)
    streets, _ = load_streets(city, settings["widthM"], "all_public", streets_only=True, reuse_graph=reuse_graph)
    print("Loading water...", flush=True)
    water = load_water(city, settings["widthM"], coastline=settings["coastline"])
    output = output or ROOT / "output" / "puzzles"
    output.mkdir(parents=True, exist_ok=True)
    stem = output / puzzle["id"]
    svg = svg_document(streets, settings["widthM"], water)
    receipt = {"id": puzzle["id"], "map": settings, "renderVersion": render_version,
               "generated_at": datetime.now(timezone.utc).isoformat(), "osmnx_version": ox.__version__,
               "overpass_url": ox.settings.overpass_url, "attribution": ATTRIBUTION,
               "data_note": "Responses may be cached; generation time is not a data snapshot date."}
    # Stage output before replacing any existing reviewed file.
    for extension, content in [(".svg", svg), (".json", json.dumps(receipt, indent=2, ensure_ascii=False) + "\n")]:
        temporary = stem.with_suffix(extension + ".tmp")
        temporary.write_text(content, encoding="utf-8")
        temporary.replace(stem.with_suffix(extension))
    name = escape(puzzle["city"]["name"])
    html = f'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Review {puzzle['id']}</title>
<style>body{{margin:24px auto;padding:0 20px;max-width:850px;background:#eaf2fb;color:#1c314b;font:16px system-ui}}img{{width:100%;background:white}}p{{line-height:1.6}}</style>
<h1>{puzzle['id']} · {name}</h1><p>{settings['widthM']/1000:g} × {settings['widthM']/1000:g} km · North up · Review copy (answer shown)</p>
<img src="{puzzle['id']}.svg" alt="Street network of {name}"><p>{escape(puzzle['reveal'])}</p>
<p>Check streets, water, framing, and phone-size readability before enabling this puzzle in puzzles.json.</p>
<p><a href="https://www.openstreetmap.org/copyright">{ATTRIBUTION}</a></p></html>'''
    stem.with_suffix(".html").write_text(html, encoding="utf-8")
    print(f"Preview: {stem.with_suffix('.html')}\nAfter reviewing, set enabled to true in puzzles.json and run npm run assets.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reuse-graph", action="store_true")
    parser.add_argument("--overpass-url", default=ox.settings.overpass_url)
    args = parser.parse_args()
    ox.settings.use_cache = True
    ox.settings.cache_folder = str(ROOT / "data" / "cache")
    ox.settings.overpass_url = args.overpass_url
    ox.settings.requests_timeout = 180
    try:
        request = json.load(sys.stdin)
        generate_puzzle(request["puzzle"], request["renderVersion"], args.reuse_graph)
    except Exception as error:
        print(f"Generation failed: {error}\nCheck the definition or retry later if Overpass is busy. Existing outputs are kept if downloading fails.", file=sys.stderr)
        sys.exit(1)
