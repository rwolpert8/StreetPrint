"""Build a local before/after gallery from the Paris/Barcelona experiment outputs."""

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    sections = []
    for city, name in [("paris", "Paris"), ("barcelona", "Barcelona")]:
        versions = [("6000m-drive", "Original: drivable roads"),
                    ("6000m-streets", "Revised: streets + pedestrian streets + service lanes")]
        if city == "paris":
            versions.append(("6000m-streets-water", "Revised + inland water"))
        cards = []
        for folder, title in versions:
            source = ROOT / "output" / folder / f"{city}.svg"
            if not source.exists():
                raise SystemExit(f"Generate this map first: {source}")
            url = f"../{folder}/{city}.svg"
            cards.append(f'<figure><figcaption>{escape(title)}</figcaption>'
                         f'<a href="{url}" target="_blank"><img src="{url}" '
                         f'alt="{escape(name + ": " + title)}"></a></figure>')
        sections.append(f'<section><h2>{name}</h2><div class="maps">'
                        + "".join(cards) + '</div></section>')
    output = ROOT / "output" / "street-refinement"
    output.mkdir(parents=True, exist_ok=True)
    (output / "index.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>StreetPrint — street filter comparison</title><style>'
        'body{margin:24px;font:16px system-ui;color:#24323b;background:#faf9f6}'
        'h1{font-size:26px}h2{font-size:22px;margin-top:36px}'
        'p{max-width:85ch;line-height:1.6}.maps{display:grid;gap:20px;'
        'grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}'
        'figure{margin:0}figcaption{min-height:3em;font-size:15px}'
        'img{width:100%;border:1px solid #cbd0d1}a{color:inherit}</style>'
        '<h1>StreetPrint / restoring the street pattern</h1>'
        '<p>Same centre, 6 × 6 km crop, north-up orientation, and line width in every '
        'version. Click a map to inspect the full SVG.</p>'
        '<p>The revised filter includes pedestrian streets and service lanes without '
        'drawing every sidewalk or path. Paris also tests a water layer: this is an '
        'additional geographic clue, so it remains optional.</p>'
        + "".join(sections)
        + '<p>Blank areas can still be parks, private land, or unmapped connections. '
        'We do not invent street connections. Barcelona has no water layer here; '
        'coastal water requires separate treatment.</p>'
        '<p><a href="https://www.openstreetmap.org/copyright">'
        '© OpenStreetMap contributors</a> · See each output folder’s manifest for settings.</p></html>',
        encoding="utf-8",
    )
    print(output / "index.html")


if __name__ == "__main__":
    main()
