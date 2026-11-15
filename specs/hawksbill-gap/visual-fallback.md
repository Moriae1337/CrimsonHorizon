# Hawksbill Gap visual fallback

[Issue #37](https://github.com/Moriae1337/martian-map/issues/37) packages a
[746 × 747 pixel JPEG](../../frontend/public/hawksbill-gap-overview.jpg) from
the same HiRISE orthomosaic used for live Hawksbill Gap imagery. It covers the
full scenario extent and adds 100,417 bytes to the static deployment.

## Source and reuse

USGS marks the orthomosaic release CC0 1.0 Universal. The Astropedia
distribution asks users to cite the authors. The [NASA Mars Trek WMTS
capabilities](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml)
identify the matching `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`
layer and list no additional use constraints. Checked 2026-11-14.
[USGS rights and release date][release] · [Astropedia record][astropedia]

Credit USGS Astrogeology Science Center / NASA / JPL / University of Arizona.
Cite Fergason, Galuszka, Hare, Mayer, and Redding (2020), _Mars 2020 Terrain
Relative Navigation HiRISE Orthorectified Image Mosaic_,
[DOI 10.5066/P9QJDP48][doi]. Display **Released 2020-08-06** as the
source publication date. The mosaic combines multiple observations. The
related elevation mosaic has a separate [USGS release and DOI][dtm].

## Packaging

1. Fetch zoom 16, columns 93717–93720 and rows 26045–26048, from the
   [Mars Trek tile matrix](hirise-wmts-coverage.md#tile-matrix).
2. Assemble the 256 px tiles with columns increasing east and rows increasing
   south. Crop at global pixel edges `[23991605, 6667731, 23992351, 6668478]`
   (left, top, right exclusive, bottom exclusive). Every cropped pixel has
   alpha 255.
3. Save the grayscale channel as an optimized JPEG at quality 85
   (Pillow 13.0.0). The crop changes the extent and encoding. It preserves
   the zoom-16 pixel grid.

Packaged JPEG SHA-256:
`e65ec865d02bb21e8d0d52282ae5317c685496fbe6dc3e50cb4557a519b425a6`.

East–west scale at the crop centre is approximately 0.603 m/px. It uses
`180 / (256 × 2^16)` degrees per pixel, Mars sphere radius 3,396,190 m,
and the cosine of the centre latitude (18.459° N). The 100 m horizontal
scale bar spans 22.22% of the image width.

The image-edge bounds `[west, south, east, north]` in Mars 2000 degrees are
`[77.40199685096741, 18.45499277114868, 77.41000056266785, 18.46300721168518]`.
Suggested alt text is “Grayscale overhead view of Hawksbill Gap showing rocky ridges
and rippled sand.”

## Outage integration

[Issue #67](https://github.com/Moriae1337/martian-map/issues/67) owns tile
failure detection and presentation. Resolve `hawksbill-gap-overview.jpg` relative
to Vite's base URL and use the alt text, date, credit, and scale above.
Size the scale bar against the rendered image width. If the local image
fails to load, show **Background imagery unavailable.** Keep route and
stop selection and plan details usable in both cases.

To verify after integration, block requests to `https://trek.nasa.gov/tiles/*`
and reload the Hawksbill Gap plan. Confirm that the overview loads locally,
its scale and credit remain visible, and both route options and science
stops are usable. Then block the JPEG as well and confirm the unavailable
message and the same plan controls.

[astropedia]: https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_orthorectified_image_mosaic
[doi]: https://doi.org/10.5066/P9QJDP48
[dtm]: https://doi.org/10.5066/P9REJ9JN
[release]: https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-hirise-orthorectified-image-mosaic
