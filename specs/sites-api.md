# 3D sites, route planner and globe labels API

Backs the 2D **Route planner**, the **3D Site** and the **Globe** views (MOMAR-inspired). All responses are JSON
unless noted; every route is a GET so the existing CORS policy applies.

## Sites

| Site id          | Region                       | DTM grid                           | Texture                                        |
| ---------------- | ---------------------------- | ---------------------------------- | ---------------------------------------------- |
| `columbia-hills` | Gusev crater (Spirit, MER-A) | 500 × 750 cells, 8 m (4 × 6 km)    | HiRISE `PSP_001513_1655_RED_A_01_ORTHO`, 2.5 m |
| `hawksbill-gap`  | Jezero crater (Perseverance) | 500 × 500 cells, 8 m (4 × 4 km)    | TRN HiRISE orthomosaic, 2.5 m                  |
| `jezero-crater`  | Jezero crater, regional      | 500 × 500 cells, 20 m (10 × 10 km) | TRN CTX orthomosaic, 10 m                      |

Columbia Hills uses the HiRISE stereo DTM `DTEEC_001513_1655_001777_1650`; Hawksbill
Gap uses the USGS Mars 2020 TRN HiRISE DTM mosaic (DOI 10.5066/P9REJ9JN), the same
elevation source as the 2D scenario, with the matching TRN HiRISE orthomosaic
(DOI 10.5066/P9QJDP48) as texture, cut to a 4 km window so routes of several
kilometres fit.

`jezero-crater` is a regional site for long traverses (routes of 10 km and more):
a 10 × 10 km window of the USGS Mars 2020 TRN CTX DTM mosaic, 20 m
(DOI 10.5066/P906QQT8), centred on the Octavia E. Butler landing site and textured
with the TRN CTX orthomosaic (DOI 10.5066/P9GV1ND3). The 20 m cells smooth out
boulders and small scarps, so local slopes can be steeper than the grid shows; the
package notes and the planner panel say so. A 12.4 km route on it plans in about
0.8 s locally, the same as the 500 × 500 HiRISE grids.

Packages are built offline by `backend/prep/site_terrain.py` and committed under
`backend/data/sites/<site>/` (`terrain.json`, `texture.jpg`). Sources and caveats
are listed in each package (`sources`, `notes`) and in [sources.md](sources.md).
Grids use a spherical azimuthal-equidistant frame centred on `center_lon_lat`
(Mars sphere, R = 3,396,190 m): `x` metres east, `y` metres north.

The Columbia Hills planner offers a one-way Husband Hill to Home Plate example.
It uses corrected Spirit positions from the [PDS Analyst’s Notebook traverse CSV][spirit-traverse].
Husband Hill uses site 114, drive 727 (sols 619–623, which include the
[summit panorama][spirit-summit]). The Home Plate approach uses site 124, drive 0
(sols 744–746, after the rover [reached the northern edge][home-plate]).
The corrected easting and northing pairs are `(1410.65, -864634.66)` and
`(1516.75, -865387.00)` metres. The
[traverse label][spirit-label] defines an equirectangular projection centred at
175.5° E and 0°, and the [Spirit basemap][spirit-basemap] specifies the 3,396,190 m
sphere. Convert the pairs to longitude and latitude, then project them into the
site grid. The route API computes a crew route between the endpoints.

[spirit-traverse]: https://an.rsl.wustl.edu/mera/AN/pages/mer/mer_traverse.htm
[spirit-label]: https://an.rsl.wustl.edu/mera/AN/meri/MER/traverse/MERA_traverse.lbl
[spirit-basemap]: https://an.rsl.wustl.edu/mera/AN/meri/MER/traverse/MERA_Basemap_25cm_README.txt
[spirit-summit]: https://science.nasa.gov/resource/everest-panorama-20-20-vision/
[home-plate]: https://ntrs.nasa.gov/api/citations/20070016011/downloads/20070016011.pdf

### `GET /sites`

`{"sites": [{"site_id", "name", "region", "center_lon_lat", "cell_size_m", "shape"}]}`

### `GET /sites/{site_id}/terrain`

The package: `crs_proj4`, `bounds_m`, `cell_size_m`, `shape` `[rows, cols]` (row 0 is
north), `elevation` (`uint16-le-base64`: `z = offset_m + v * scale_m`, `65535` =
NoData), `texture`, `sources`, `notes`. `Cache-Control: public, max-age=86400`.

### `GET /sites/{site_id}/texture.jpg`

Grayscale HiRISE orthoimage resampled onto the same frame as the DTM.

### `GET /sites/{site_id}/routes`

| Query           | Meaning                                                  |
| --------------- | -------------------------------------------------------- |
| `start`, `end`  | `x,y` in site metres                                     |
| `stops`         | optional, up to 8 `x,y` pairs separated by `;`, in order |
| `max_grade_deg` | 5–45, default 25: planning parameter for the grade limit |

Returns `routes`: `shortest` and `lower_risk`, each with `path_xy`, `path_lon_lat`,
`profile` (`d`, `z`, `x`, `y`, `slope` every cell length) and `metrics`
(`length_m`, `length_3d_m`, `ascent_m`, `descent_m`, `max_grade_deg`,
`mean_surface_slope_deg`, `max_surface_slope_deg`, `walk_minutes`,
`grade_class_m` with the project's 5° classes). 422 for points outside the grid,
on NoData, unreachable within the limit, or malformed input.

Method (`backend/app/routing.py`):

- A\* on the 8-connected grid; moves steeper than `max_grade_deg` along the direction
  of travel (diagonals checked through the bilinear midpoint) or touching NoData are
  excluded, then line-of-sight string pulling removes 45° zig-zags without raising cost.
- `shortest`: cost = 3D distance. `lower_risk`: distance ×
  `(1 + 4 (slope / max_grade)² + roughness / p90(roughness))`, where slope is the Horn
  3×3 surface slope and roughness the mean absolute residual from that plane.
- Walk time: the spacesuit-scaled Tobler function used by `prep/eva_budget.py`
  (2.5 km/h on flat ground).
- There is still no cited grade threshold for walking in a loaded spacesuit, so
  `max_grade_deg` is labelled a planning parameter and no route is called safe.

## `GET /terrain/nomenclature`

IAU-adopted Mars features from the USGS Gazetteer of Planetary Nomenclature
(`MARS_nomenclature_center_pts.zip`), at least 100 km across plus the mission craters
Jezero, Gale, Gusev, Endeavour and Eberswalde. Built by
`backend/prep/iau_nomenclature.py`; longitudes converted to −180…180° E. Each feature:
`name`, `type`, `category`, `lon`, `lat`, `diameter_km`, `link` (Gazetteer page).

## Frontend

- `frontend/src/sites.ts`: decoding, AEQD projection, API calls (no three.js).
- `frontend/src/useRoutePlanner.ts`: one planner state (site, waypoints per site, grade
  limit, planned routes, selected route) shared by the 2D map and the 3D view, so
  both always show the same site, points and routes.
- `frontend/src/RoutePlannerPanel.tsx`: the side panel used in both views (site, A/B
  and stops, grade limit, comparison table with Δ, elevation profile, GeoJSON export).
- 2D (`MarsMap.tsx`, sidebar mode "Route planner"): the site's HiRISE texture as an
  image overlay, the window outline, click-to-pick waypoints, both routes with
  direction arrows on the selected one; clicking a route selects it. Picking uses the
  immediate click and double-click zoom is off in this mode, so two quick clicks place
  A then B. A, B and stops can be dragged (replanned on drop); a new stop is inserted
  where it lengthens the straight-line chain least (`insertStop`). A status line on
  the map says what a click does, shows planning progress and errors, and reports
  clicks outside the window.
- Window size: grids are kept near 500 × 500 cells because the pure-Python A* and
  slope/roughness pass grow quickly (measured locally: about 1 s per route at
  500 × 500, about 15 s at 1000 × 1000), which would be too slow on Render Free.
- 3D (`SiteExplorer.tsx` + `Terrain3DView.tsx`): the same planner on the terrain, plus
  playback (walker drawn enlarged, illustrative scale) and vertical exaggeration.
- `frontend/src/MarsGlobe.tsx`: globe textured from local equirectangular WebP images
  assembled offline from Mars Trek WMTS tiles (Viking MDIM 2.1 and MOLA shaded
  relief). IAU labels are filtered by
  camera distance with greedy overlap removal, feature search and site markers.
- Both views are lazy-loaded so the 2D map bundle does not include three.js.
