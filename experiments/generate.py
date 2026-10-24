"""Generate equal-scale street puzzles. Run from any working directory."""

import argparse
from datetime import datetime, timezone
from html import escape
import json
from pathlib import Path

import osmnx as ox
from osmnx._errors import InsufficientResponseError
from pyproj import CRS, Transformer
from shapely.geometry import box, LineString
from shapely import make_valid, transform, union_all, set_precision
from shapely.ops import polygonize_full

ROOT = Path(__file__).resolve().parents[1]
ATTRIBUTION = "© OpenStreetMap contributors"
STREET_TYPES = {
    "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified",
    "residential", "living_street", "pedestrian", "service", "road",
    "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link",
}


def local_crs(latitude, longitude):
    # A city-centred projection uses metres and aligns north at the image centre.
    # Unlike Web Mercator, the physical scale does not vary with city latitude.
    return CRS.from_proj4(
        f"+proj=aeqd +lat_0={latitude} +lon_0={longitude} +datum=WGS84 +units=m"
    )


def map_area(city, width_m):
    lat, lon = city["center"]  # OSMnx uses latitude, longitude.
    crs = local_crs(lat, lon)
    half = width_m / 2
    frame = box(-half, -half, half, half)
    to_wgs84 = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    # Download beyond the frame so roads crossing its edges are retained.
    polygon = transform(frame.buffer(500), to_wgs84.transform, interleaved=False)
    return crs, frame, polygon


def load_streets(city, width_m, network_type, streets_only=False, reuse_graph=False):
    crs, frame, polygon = map_area(city, width_m)
    graph_path = ROOT / "data" / "graphs" / f"{city['id']}-{width_m}-{network_type}.graphml"
    if reuse_graph and graph_path.exists():
        print(f"Reusing {graph_path.name}", flush=True)
        graph = ox.load_graphml(graph_path)
        return clip_streets(graph, crs, frame, streets_only), crs
    graph = ox.graph_from_polygon(
        polygon, network_type=network_type, simplify=True,
        retain_all=True, truncate_by_edge=True,
    )
    graph_path.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(graph, graph_path)
    return clip_streets(graph, crs, frame, streets_only), crs


def clip_streets(graph, crs, frame, streets_only=False):
    """Project and clip a downloaded graph, optionally selecting street classes."""
    if streets_only:
        # A simplified edge can carry multiple highway tags. Keep it if any
        # segment is a street; don't filter by whether cars can use that street.
        selected = [(u, v, k) for u, v, k, data in graph.edges(keys=True, data=True)
                    if is_street(data.get("highway"))]
        graph = graph.edge_subgraph(selected).copy()
    projected = ox.project_graph(graph, to_crs=crs)
    # Remove duplicate travel directions; preserve distinct parallel roads.
    undirected = ox.convert.to_undirected(projected)
    edges = ox.graph_to_gdfs(undirected, nodes=False)
    clipped = edges.geometry.intersection(frame)
    return [g for g in clipped if not g.is_empty]


def is_street(highway):
    return bool(STREET_TYPES.intersection(highway if isinstance(highway, list) else [highway]))


def load_water(city, width_m, coastline=False):
    """Combine inland water with optional coastal fill, retaining islands."""
    crs, frame, polygon = map_area(city, width_m)
    try:
        features = ox.features_from_polygon(
            polygon, tags={"natural": ["water", "coastline"] if coastline else "water", "waterway": "riverbank"},
        ).to_crs(crs)
    except InsufficientResponseError as error:
        if not str(error).startswith("No matching features"):
            raise  # An API failure must not silently produce a map with missing water.
        print("No mapped water found in this crop; drawing streets only.", flush=True)
        return []
    areas = [make_valid(g).intersection(frame) for g in features.geometry
             if g.geom_type in {"Polygon", "MultiPolygon"}]
    if coastline and "natural" in features.columns:
        coasts = features.loc[features["natural"] == "coastline", "geometry"]
        if any(g.intersection(frame).length > 0 for g in coasts):
            areas.extend(coastal_water(coasts, frame))
        else:
            # Harbours can be mapped as water polygons, with the coastline at
            # their mouth outside the crop (as in central Sydney).
            print("No coastline inside the crop; using mapped water polygons.", flush=True)
    return list(polygons(union_all(areas)))


def coastal_water(coasts, frame):
    """Close local coastlines against the crop boundary; OSM water is on the right.

    This requires coastline inside the crop. It cannot classify an entirely
    offshore crop, and rejects broken coastlines instead of guessing a closure.
    Reference: https://wiki.openstreetmap.org/wiki/Tag:natural=coastline
    """
    # Millimetre precision keeps shared projected endpoints joined at the frame.
    clipped = [part for coast in coasts
               for part in lines(set_precision(coast.intersection(frame), 0.001))
               if part.length > 0]
    if not clipped:
        raise ValueError("Coastal fill requires coastline inside the map frame")
    network = union_all([frame.boundary, *clipped])
    faces, cuts, dangles, invalid = polygonize_full(list(lines(network)))
    if any(g.length > 0.01 for g in (cuts, dangles, invalid)):
        raise ValueError("Incomplete coastline: inspect the source before filling water")
    # Keep the source direction; polygonization itself can reverse linework.
    segments = [LineString([a, b]) for coast in clipped
                for a, b in zip(coast.coords, list(coast.coords)[1:]) if a != b]
    water = []
    for face in faces.geoms:
        point = face.representative_point()
        nearest = min(segments, key=lambda segment: segment.distance(point))
        (ax, ay), (bx, by) = nearest.coords
        cross = (bx - ax) * (point.y - ay) - (by - ay) * (point.x - ax)
        if cross < 0:  # Right side is water; left side is land.
            water.append(face)
    return water


def polygons(geometry):
    if geometry.geom_type == "Polygon" and not geometry.is_empty:
        yield geometry
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from polygons(part)


def lines(geometry):
    if geometry.geom_type == "LineString":
        yield geometry
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from lines(part)


def svg_document(geometries, width_m, water=None):
    size = 1000
    scale = size / width_m

    def path_for(coords):
        # SVG y grows downwards; projected north must point upwards.
        points = [(size / 2 + x * scale, size / 2 - y * scale) for x, y in coords]
        return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points)

    water_paths = []
    for area in water or []:
        rings = [area.exterior, *area.interiors]
        water_paths.append(" ".join(path_for(r.coords) + " Z" for r in rings))
    water_svg = ""
    if water is not None:
        water_svg = (
            '<g id="water" fill="#c8dce4" fill-rule="evenodd">\n'
            + "\n".join(f'<path d="{path}"/>' for path in water_paths)
            + '\n</g>\n'
        )
    paths = []
    for geometry in geometries:
        for line in lines(geometry):
            paths.append(path_for(line.coords))
    # No city name, coordinates, OSM IDs, or road names inside the puzzle SVG.
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n'
        '<title>Unlabeled street network</title>\n'
        f'<metadata>{ATTRIBUTION}; https://www.openstreetmap.org/copyright</metadata>\n'
        '<rect width="1000" height="1000" fill="#faf9f6"/>\n'
        + water_svg
        + '<g fill="none" stroke="#24323b" stroke-width="1.4" '
        'stroke-linecap="round" stroke-linejoin="round">\n'
        + "\n".join(f'<path d="{path}"/>' for path in paths)
        + '\n</g></svg>\n'
    )


def write_preview(output, records):
    cards = "\n".join(
        f'<article><h2>{escape(r["name"])}</h2>'
        f'<img src="{r["svg"]}" alt="Street network of {escape(r["name"])}">'
        f'<p>{escape(r["focus"])}</p></article>' for r in records
    )
    (output / "index.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>StreetPrint — first maps</title><style>'
        'body{margin:32px;background:#faf9f6;color:#24323b;font:16px system-ui}'
        'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:28px}'
        'img{width:100%;border:1px solid #cbd0d1}h1{font-size:28px}h2{font-size:20px}'
        'p{max-width:80ch;line-height:1.5}</style>'
        '<h1>StreetPrint / first maps</h1>'
        f'<p>Each square covers {records[0]["width_m"] / 1000:g} × '
        f'{records[0]["width_m"] / 1000:g} km. North up; uniform line width; '
        f'Network: {records[0]["network_type"]}; '
        f'drawing: {"street classes only" if records[0].get("streets_only") else "all downloaded ways"}.</p>'
        '<p>Compare at desktop and phone widths: is the pattern readable, distinctive, '
        'and sufficiently centred? '
        + ('Blue areas show mapped water; coastal fill is included where enabled in the manifest. '
           if records[0].get("water") else 'There is no water layer. ')
        + 'Other blank areas mean absence of included roads.</p>'
        f'<main>{cards}</main><p><a href="https://www.openstreetmap.org/copyright">'
        f'{ATTRIBUTION}</a> · Data retrieved during generation; see manifest.json.</p></html>',
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--city", help="Generate only this city ID (e.g. tokyo)")
    parser.add_argument("--overpass-url", default=ox.settings.overpass_url, help="Overpass API base URL, without /interpreter")
    parser.add_argument("--reuse-graph", action="store_true", help="Use a saved graph if present; only use when the city's crop centre has not changed")
    parser.add_argument("--width-m", type=int, default=6000)
    parser.add_argument("--network-type", choices=["drive", "walk", "all_public"], default="drive")
    parser.add_argument("--water", action="store_true", help="Add mapped inland water polygons (not sea coastlines)")
    parser.add_argument("--coastline", action="store_true", help="Also fill coastal water where coastline crosses the crop; requires --water")
    parser.add_argument("--streets-only", action="store_true", help="Draw street classes including pedestrian/service streets; requires all_public")
    args = parser.parse_args()
    if not 1000 <= args.width_m <= 20000:
        parser.error("--width-m must be between 1000 and 20000")
    if args.streets_only and args.network_type != "all_public":
        parser.error("--streets-only requires --network-type all_public")
    if args.coastline and not args.water:
        parser.error("--coastline requires --water")
    cities = json.loads((ROOT / "experiments" / "cities.json").read_text(encoding="utf-8"))
    if args.city:
        cities = [city for city in cities if city["id"] == args.city]
        if not cities:
            parser.error("Unknown city ID; see experiments/cities.json")
    ox.settings.use_cache = True
    ox.settings.overpass_url = args.overpass_url
    ox.settings.cache_folder = str(ROOT / "data" / "cache")
    ox.settings.requests_timeout = 180
    suffix = "-water" if args.water else ""
    drawing = "streets" if args.streets_only else args.network_type
    output = ROOT / "output" / f"{args.width_m}m-{drawing}{suffix}"
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / "manifest.json"
    records = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    for city in cities:
        print(f"Generating {city['name']}...", flush=True)
        geometries, crs = load_streets(city, args.width_m, args.network_type, args.streets_only, args.reuse_graph)
        if args.water:
            print("Loading water...", flush=True)
        water = load_water(city, args.width_m, args.coastline) if args.water else None
        filename = f"{city['id']}.svg"
        (output / filename).write_text(svg_document(geometries, args.width_m, water), encoding="utf-8")
        record = dict(city, svg=filename, width_m=args.width_m,
                      network_type=args.network_type, crs=crs.to_string(),
                      water=args.water,
                      coastline=args.coastline,
                      streets_only=args.streets_only,
                      generated_at=datetime.now(timezone.utc).isoformat(),
                      osmnx_version=ox.__version__, attribution=ATTRIBUTION,
                      overpass_url=ox.settings.overpass_url,
                      data_note="OSM responses may be cached; generated_at is not a snapshot date.")
        records = [r for r in records if r["id"] != city["id"]] + [record]
        manifest_path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        write_preview(output, records)
        print(f"Saved {output / filename}", flush=True)


if __name__ == "__main__":
    main()
