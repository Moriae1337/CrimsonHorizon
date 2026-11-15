# Wildcat Ridge science stop

This record supports [issue #20](https://github.com/Moriae1337/martian-map/issues/20) and the [Hawksbill Gap crew field objective](field-objective.md).

Wildcat Ridge is an exposed rock surface in the Hogwallow Flats member at the front of Jezero's western fan. Perseverance drilled two rock cores here. The mission reports describe the rock as fine-grained and sulfate-bearing, with calcium-sulfate veins cutting through it. [PDS Initial Reports, sections 14 and 15][pds]

## Sample records

| Sample     | Public sample no. | Mission designation | Latitude (N) | Longitude (E) | Coring date in PDS | Sealing sol |
| ---------- | ----------------: | ------------------- | -----------: | ------------: | ------------------ | ----------: |
| Hazeltop   |                12 | `M2020-509-14`      |  18.45863707 |   77.40588851 | 2022-07-25         |         509 |
| Bearwallow |                13 | `M2020-516-15`      |  18.45863832 |   77.40588685 | 2022-08-02         |         516 |

Coordinates, coring dates, and sealing sols come from the report headers for Hazeltop (section 14) and Bearwallow (section 15). A sol is a Martian day. NASA's public sample catalog lists July 27 and August 3 in its date column. Use the explicitly labeled PDS coring dates above if the card shows an Earth date. The sample numbers 12 and 13 come from NASA's public catalog. [PDS Initial Reports][pds] · [NASA sample catalog][catalog]

## Map and card

- Use one Wildcat Ridge science-stop pin at the Hazeltop sample coordinate. In map data, store the point as longitude then latitude, `[77.40588851, 18.45863707]`. Label it as a sample location. The crew's observation position and route endpoint have separate coordinates.
- List both cores with their mission designations, public sample numbers, and sols. Show **Berry Hollow** as the shared abrasion patch, an area the rover ground down to expose fresh rock. [PDS Initial Reports, sections 14 and 15][pds]
- Use the annotated Mastcam-Z mosaic PIA24928 for context. Its labels show both drill holes and Berry Hollow. The mosaic was acquired on sol 518. A separate image, PIA24929, shows the two cores inside the drill. Preserve the source links and image credits. [Annotated outcrop][mosaic] · [Core images][cores]
- The field brief asks the crew to photograph a vein and nearby layers with a scale and record whether the vein crosses the layers. A vein that cuts across them formed after those layers. Record the relationship as unresolved if the view is unclear. [Crew field objective](field-objective.md) · [PDS Initial Reports, section 14][pds]

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[catalog]: https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/
[mosaic]: https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/
[cores]: https://www.jpl.nasa.gov/images/pia24929-perseverance-rock-cores-from-wildcat-ridge/
