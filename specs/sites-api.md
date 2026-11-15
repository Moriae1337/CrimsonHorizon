# 3D sites, route planner and globe labels API

Backs the 2D **Route planner**, the **3D Site** and the **Globe** views (MOMAR-inspired). All responses are JSON
unless noted; every route is a GET so the existing CORS policy applies.

## Sites

Two craters, each with a regional site for long traverses (CTX, 20 m) and a
detail site (HiRISE, 8 m):

| Site id          | Region                       | DTM grid                           | Texture                                        |
| ---------------- | ---------------------------- | ---------------------------------- | ---------------------------------------------- |
| `jezero-crater`  | Jezero crater, regional      | 850 × 400 cells, 20 m (17 × 8 km)  | TRN CTX orthomosaic, 10 m                      |
| `hawksbill-gap`  | Jezero crater (Perseverance) | 500 × 500 cells, 8 m (4 × 4 km)    | TRN HiRISE orthomosaic, 2.5 m                  |
| `gusev-crater`   | Gusev crater, regional       | 600 × 600 cells, 20 m (12 × 12 km) | USGS controlled CTX orthoimage (DRG), 20 m     |
| `columbia-hills` | Gusev crater (Spirit, MER-A) | 500 × 750 cells, 8 m (4 × 6 km)    | HiRISE `PSP_001513_1655_RED_A_01_ORTHO`, 2.5 m |

Columbia Hills uses the HiRISE stereo DTM `DTEEC_001513_1655_001777_1650`; Hawksbill
Gap uses the USGS Mars 2020 TRN HiRISE DTM mosaic (DOI 10.5066/P9REJ9JN), the same
elevation source as the 2D scenario, with the matching TRN HiRISE orthomosaic
(DOI 10.5066/P9QJDP48) as texture, cut to a 4 km window so routes of several
kilometres fit.

`jezero-crater` covers the whole localized Perseverance traverse (landing site,
delta, crater rim): a 17 × 8 km window of the USGS Mars 2020 TRN CTX DTM mosaic,
20 m (DOI 10.5066/P906QQT8), centred at 77.3405° E, 18.4598° N and textured with the
TRN CTX orthomosaic (DOI 10.5066/P9GV1ND3). `gusev-crater` covers the whole Spirit
traverse (landing site, Bonneville crater, Columbia Hills, Home Plate): a 12 × 12 km
window of the USGS controlled CTX DTM
`P21_009319_1651_XN_14S184W__P01_001513_1654_XI_14S184W` (geoid-adjusted DEM and DRG,
CC0, USGS STAC `mro_ctx_controlled_usgs_dtms`), centred at 175.502° E, 14.582° S;
96.8 % of its cells are valid. The 20 m cells smooth out boulders and small scarps,
so local slopes can be steeper than the grid shows; the package notes and the
planner panel say so.

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

### `GET /sites/{site_id}/traverse`

The rover's localized traverse inside the site window, cached for a day:
`site_id`, `rover` (`perseverance` | `spirit`), `name`, `sols` `[first, last]`,
`length_m` (whole traverse), `lines` (runs of `[x, y]` inside the window, metres in
the site frame) and `stops` (one per rover site: `site`, `sol_start`, `sol_end`,
`lon`, `lat`, `x`, `y`), plus `source` (`label`, `url`). 404 for an unknown site.

The data is built offline by `backend/prep/rover_traverses.py` into
`backend/data/rover_traverses.json`:

- Perseverance: NASA/JPL Mars 2020 MMGIS traverse and waypoints layers
  (`M20_traverse.json`, `M20_waypoints.json`), sols 13–2022, 91 stops, 46.8 km.
- Spirit: PDS MER Analyst's Notebook corrected traverse (`MERA_traverse.csv`,
  equirectangular centred at 175.5° E), sols 1–2209, 139 stops, 7.1 km. NASA's
  odometry figure is 7.73 km; ours is the localized line, labelled as such.

Lines are thinned to 10 m; the length is measured before thinning.

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
- Rover's path: `/sites/{id}/routes?rover=true` (the frontend always sends it) adds a
  third route, `rover`, when A and B both lie within 150 m of the rover's traverse:
  the traverse itself between the line points nearest A and B, with the same metrics
  and profile as planned routes. It ignores stops and the grade limit. "Follow the
  rover's path" selects it, so it can be compared in the table and walked in 3D
  (dotted on the map; the context traverse line is hidden in 3D while it is shown).
- Guide: the header "Guide" button opens a bilingual how-to (quick start, views, map
  legend, data and limits); it opens once by itself on a first visit. English is the
  default language; the header EN | УК toggle highlights the active one.
- Rover traverse: the planner panel shows each crater's summary, facts and links
  (`frontend/src/craters.ts`), the rover's sols and localized length, and "Follow the
  rover's path", which sets A and B at the rover's first and last stop in the window
  with up to 8 of its stops between them (`roverWaypoints`). The 2D map draws the
  traverse and its stops; clicking a stop adds it to the route (or snaps A/B to it
  while picking). The 3D view draws the traverse with its first and last sol.
- Routing speed: A* runs on flat lists with precomputed cell weights. Grids of
  300,000 cells or more are searched coarse-to-fine: a block-averaged grid finds a
  corridor (10 coarse cells wide) and the full grid is searched only inside it,
  falling back to a full search if that fails. Measured locally: 0.5 s at 500 × 500,
  about 2 s at 1000 × 1000; a 17 km Jezero route through 8 rover stops takes about
  0.7 s.
- 3D (`SiteExplorer.tsx` + `Terrain3DView.tsx`): the same planner on the terrain, plus
  playback (walker drawn enlarged, illustrative scale) and vertical exaggeration.
- `frontend/src/MarsGlobe.tsx`: globe textured from local equirectangular WebP images
  assembled offline from Mars Trek WMTS tiles (Viking MDIM 2.1 and MOLA shaded
  relief). IAU labels are filtered by
  camera distance with greedy overlap removal and feature search. Jezero and Gusev
  have markers; clicking one (or the IAU label) opens a card with the crater summary
  and, for each of its two sites, "Plan routes (2D)" and "Open in 3D". Every opened
  place also gets a small map (`PlaceMap.tsx`): Viking colour under the global CTX
  mosaic (`GLOBAL_CTX_LAYER`, to about 10 m/px), framed on the IAU size, with the
  crater rim drawn as a circle of the IAU diameter. Tile helpers shared with the 2D
  map live in `marsTiles.ts`. "Open on 2D map" frames the same extent (`placeExtent`)
  and switches the 2D base layer to the global CTX mosaic, which the frontend adds
  to the API's catalog; MOLA and Viking stop at 463 and 232 m/px.
- Caching: `/sites/{id}/terrain` and `/sites/{id}/traverse` send `Cache-Control:
public, no-cache` with an `ETag` from the data files' size and mtime, so browsers
  revalidate (304 when unchanged) and a rebuilt package is never shown with a stale
  one. The planner also clips the traverse to the loaded package (`clipTraverse`).
- Both views are lazy-loaded so the 2D map bundle does not include three.js.
