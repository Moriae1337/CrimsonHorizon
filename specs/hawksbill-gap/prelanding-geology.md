# Hawksbill Gap prelanding geology

The regional overlay is a crop of **USGS SIM 3464, 1:75,000, published December 2, 2020**. Vivian Z. Sun and Kathryn M. Stack mapped the region before the Perseverance landing using orbital imagery. USGS marks the published map as public domain. The database metadata lists no access constraints and specifies GIS software for viewing. This crop uses the geologic unit polygons and omits the source imagery and symbology. [Publication and citation](https://doi.org/10.3133/sim3464) · [USGS public-domain statement](https://www.usgs.gov/media/images/map-sheet-sim-3464) · [Database metadata](https://pubs.usgs.gov/sim/3464/sim3464_metadata.txt)

The regional source is used because the 1:5,000 Stack et al. shapefile supplement includes a rights-reserved notice in its bundled README. The article itself was relicensed to CC BY 4.0 in 2025. [1:5,000 article and supplement](https://doi.org/10.1007/s11214-020-00739-x) · [License correction](https://doi.org/10.1007/s11214-025-01204-3)

## Prepared layer

[`prelanding_geology.geojson`](../../backend/data/hawksbill_gap/prelanding_geology.geojson) is a standalone FeatureCollection with `schema_version: "1.0"`. The collection includes the bounding box, scenario coordinate convention, source citation, scale denominator, publication date, archive checksum, and interpretation limit. Each feature retains its source object ID and the published unit symbol and name. The crop contains Jezero fan 2 unit (`NHjf2`) and Jezero floor unit (`Njf`).

The source database uses Mars 2000 spherical transverse Mercator with central meridian 77.5°E. Preparation reprojects the unit polygons to the scenario’s spherical equirectangular CRS, clips to the extent in the Hawksbill Gap manifest, then serializes the result as `[longitude, latitude]` in east-positive, planetocentric Mars degrees. Polygon coordinates use the same convention as the scenario routes. Eight decimal places preserve crop geometry during serialization. The original 1:75,000 scale still governs interpretation.

## Regeneration

Download [the original SIM 3464 database archive](https://pubs.usgs.gov/sim/3464/sim3464_database.zip) (349 MB). From `backend/`, run the following with Python 3.12+ and `uv`. The extra GIS packages are only used offline.

```sh
uv run --group prep --with pyogrio==0.12.1 --with shapely==2.1.2 python -m prep.geology /path/to/sim3464_database.zip
uv run pytest tests/test_geology.py
```

## Display handoff

Expose the standalone layer through the scenario map and show its attribution, scale and publication date with the overlay legend. Use the app’s three-color palette and label polygons with their unit symbols. The Swift Run pin falls within the regional Jezero fan 2 unit. Present that containment as regional map context and keep the Skinner Ridge block origin in the separate field interpretation. A polygon at this scale cannot resolve the block's source or the local contact. [Skinner Ridge science stop](skinner-ridge.md)
