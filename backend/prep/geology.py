"""Prepare the USGS SIM 3464 geology polygons for the Hawksbill Gap viewport."""

import argparse
import hashlib
import json
from math import radians
from pathlib import Path

from prep.common import SCENARIO_DIR, load_manifest

OUTPUT = SCENARIO_DIR / "prelanding_geology.geojson"
LAYER = "GeoUnits_v1"
SOURCE = {
    "title": "Geologic map of Jezero crater and the Nili Planum region, Mars",
    "credit": "Vivian Z. Sun and Kathryn M. Stack, U.S. Geological Survey SIM 3464",
    "url": "https://doi.org/10.3133/sim3464",
    "archive_url": "https://pubs.usgs.gov/sim/3464/sim3464_database.zip",
    "archive_sha256": "a88bd53a5573743cc4a20036c10e585106d08a433ad2f34af269e9cea1529f87",
    "layer": LAYER,
    "license": "Public domain",
    "scale_denominator": 75000,
    "published_on": "2020-12-02",
}
LIMITATION = (
    "Prelanding orbital map for regional context. Map units describe terrain at "
    "publication scale. The origin of the Skinner Ridge blocks is an independent "
    "field interpretation."
)


def prepare(archive: Path) -> dict:
    from pyogrio import read_info
    from pyogrio.raw import read
    from rasterio.crs import CRS
    from rasterio.warp import transform, transform_bounds
    from shapely import box, from_wkb, orient_polygons, to_geojson
    from shapely.ops import transform as transform_geometry

    with archive.open("rb") as stream:
        if (
            hashlib.file_digest(stream, "sha256").hexdigest()
            != SOURCE["archive_sha256"]
        ):
            raise ValueError("SIM 3464 archive does not match the published input pin")
    dataset = (
        f"/vsizip/{archive.resolve().as_posix()}"
        "/sim3464_JezeroNili_FINAL/Geodatabase/Nili.gdb"
    )
    manifest = load_manifest()
    extent = manifest["extent"]
    bounds = [extent[key] for key in ("lon_min", "lat_min", "lon_max", "lat_max")]
    radius = manifest["conventions"]["projected"]["sphere_radius_m"]
    meters_per_degree = radians(1) * radius
    crop = box(*(degrees * meters_per_degree for degrees in bounds))
    scenario_crs = CRS.from_string(f"+proj=eqc +lat_ts=0 +lon_0=0 +R={radius} +units=m")
    source_crs = CRS.from_wkt(read_info(dataset, layer=LAYER)["crs"])
    _, ids, geometries, (names, symbols) = read(
        dataset,
        layer=LAYER,
        columns=["name", "symbol"],
        bbox=transform_bounds(scenario_crs, source_crs, *crop.bounds),
        return_fids=True,
    )

    def to_geographic(eastings, northings):
        return (
            [round(x / meters_per_degree, 8) for x in eastings],
            [round(y / meters_per_degree, 8) for y in northings],
        )

    features = []
    for fid, wkb, name, symbol in sorted(
        zip(ids, geometries, names, symbols, strict=True)
    ):
        projected = transform_geometry(
            lambda x, y: transform(source_crs, scenario_crs, x, y), from_wkb(wkb)
        )
        clipped = projected.intersection(crop)
        if clipped.area == 0:
            continue
        geographic = orient_polygons(transform_geometry(to_geographic, clipped))
        if (
            geographic.geom_type not in {"Polygon", "MultiPolygon"}
            or not geographic.is_valid
        ):
            raise ValueError(f"Invalid cropped polygon for source feature {fid}")
        features.append(
            {
                "type": "Feature",
                "id": int(fid),
                "properties": {"unit_symbol": symbol, "unit_name": name},
                "geometry": json.loads(to_geojson(geographic)),
            }
        )
    if not features:
        raise ValueError("No SIM 3464 geology polygons within the scenario extent")
    return {
        "type": "FeatureCollection",
        "schema_version": "1.0",
        "id": "hawksbill-gap-prelanding-geology",
        "bbox": bounds,
        "coordinates": manifest["conventions"]["geographic"],
        "source": SOURCE,
        "limitation": LIMITATION,
        "features": features,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Original sim3464_database.zip")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    layer = prepare(args.archive)
    args.output.write_text(
        json.dumps(layer, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n"
    )


if __name__ == "__main__":
    main()
