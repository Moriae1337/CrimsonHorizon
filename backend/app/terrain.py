"""Verified NASA/USGS Mars dataset metadata and Jezero Crater reference landmarks."""

from typing import Any, Literal, TypedDict

MARS_IAU_RADIUS_M = 3_396_190.0
MARS_CRS = "IAU2000:104905"
JEZERO_DEFAULT_CENTER: tuple[float, float] = (77.452019, 18.444796)
JEZERO_DEFAULT_ZOOM = 12


class MapLayer(TypedDict):
    """Descriptor for an OGC WMTS Mars layer hosted on NASA Mars Trek."""

    id: str
    name: str
    scope: Literal["global", "regional", "local"]
    resolution_m: float
    tile_url: str
    format: Literal["image/jpeg", "image/png"]
    min_zoom: int
    max_zoom: int
    extent: tuple[float, float, float, float]
    attribution: str
    source_url: str


MAP_LAYERS: tuple[MapLayer, ...] = (
    {
        "id": "mola-color-hillshade",
        "name": "MOLA Color Hillshade (463 m/px)",
        "scope": "global",
        "resolution_m": 463.0,
        "tile_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "Mars_MGS_MOLA_ClrShade_merge_global_463m"
            "/1.0.0/default/default028mm/{z}/{y}/{x}.jpg"
        ),
        "format": "image/jpeg",
        "min_zoom": 0,
        "max_zoom": 7,
        "extent": (-180.0, -89.9991635, 179.9983271, 90.0),
        "attribution": "NASA / JPL / MOLA Science Team (Mars Trek)",
        "source_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml"
        ),
    },
    {
        "id": "viking-mdim21",
        "name": "Viking MDIM 2.1 Color Mosaic (232 m/px)",
        "scope": "global",
        "resolution_m": 232.0,
        "tile_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "Mars_Viking_MDIM21_ClrMosaic_global_232m"
            "/1.0.0/default/default028mm/{z}/{y}/{x}.jpg"
        ),
        "format": "image/jpeg",
        "min_zoom": 0,
        "max_zoom": 7,
        "extent": (-180.0, -90.0, 180.0, 90.0),
        "attribution": "USGS Astrogeology / NASA Mars Trek",
        "source_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml"
        ),
    },
    {
        "id": "jezero-ctx-ortho",
        "name": "Jezero CTX Orthomosaic (6 m/px)",
        "scope": "regional",
        "resolution_m": 6.0,
        "tile_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
            "/1.0.0/default/default028mm/{z}/{y}/{x}.png"
        ),
        "format": "image/png",
        "min_zoom": 0,
        "max_zoom": 13,
        "extent": (77.1604655, 18.2110274, 77.6991776, 18.7211945),
        "attribution": "USGS Astrogeology Science Center / NASA / JPL / MSSS",
        "source_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml"
        ),
    },
    {
        "id": "jezero-hirise-ortho",
        "name": "Jezero HiRISE Orthomosaic (0.25 m/px)",
        "scope": "local",
        "resolution_m": 0.25,
        "tile_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd"
            "/1.0.0/default/default028mm/{z}/{y}/{x}.png"
        ),
        "format": "image/png",
        "min_zoom": 0,
        "max_zoom": 17,
        "extent": (77.2229331, 18.3067994, 77.583964, 18.669315),
        "attribution": (
            "USGS Astrogeology Science Center / NASA / JPL / University of Arizona"
        ),
        "source_url": (
            "https://trek.nasa.gov/tiles/Mars/EQ/"
            "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd"
            "/1.0.0/WMTSCapabilities.xml"
        ),
    },
)


def get_map_catalog() -> dict[str, Any]:
    """Return the Mars map CRS, default Jezero view, and cited WMTS layers."""
    return {
        "crs": MARS_CRS,
        "radius_m": MARS_IAU_RADIUS_M,
        "default_center": list(JEZERO_DEFAULT_CENTER),
        "default_zoom": JEZERO_DEFAULT_ZOOM,
        "layers": [dict(layer) for layer in MAP_LAYERS],
    }


def get_jezero_landmarks() -> dict[str, Any]:
    """Return verified NASA/USGS reference locations in Jezero Crater as GeoJSON."""
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "octavia-e-butler-landing",
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.452019, 18.444796],
                },
                "properties": {
                    "name": "Octavia E. Butler Landing",
                    "category": "landing-site",
                    "summary": "Mars 2020 Perseverance touchdown site (traverse FID 0).",
                    "source": "NASA Mars Trek (Perseverance_Traverse_Path)",
                },
            },
            {
                "type": "Feature",
                "id": "jezero-western-delta",
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.40475, 18.4908],
                },
                "properties": {
                    "name": "Jezero Western Delta (Jezero_DL)",
                    "category": "science-region",
                    "summary": "Center of USGS Jezero_DL 1 m/px HiRISE DTM tile.",
                    "source": "USGS Astrogeology (DOI: 10.5066/P9REJ9JN)",
                },
            },
            {
                "type": "Feature",
                "id": "crism-hydrous-detection",
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.349998, 18.559999],
                },
                "properties": {
                    "name": "CRISM Hydrous Mineral Detection",
                    "category": "mineralogy",
                    "summary": "Orbital CRISM detection of hydrous minerals in Jezero.",
                    "source": "NASA Mars Trek (Hydrous_Mineral_Detections_OMEGA_CRISM)",
                },
            },
            {
                "type": "Feature",
                "id": "jezero-crater-center",
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.687349, 18.4082],
                },
                "properties": {
                    "name": "Jezero Crater Center",
                    "category": "crater",
                    "summary": "Approximate center of Jezero Crater (45.0 km diameter).",
                    "source": "USGS Gazetteer of Planetary Nomenclature / Mars Trek",
                },
            },
        ],
    }
