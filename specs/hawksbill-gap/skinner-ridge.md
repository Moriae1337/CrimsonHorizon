# Skinner Ridge science stop

This record supports [issue #21](https://github.com/Moriae1337/martian-map/issues/21) and the [Hawksbill Gap crew field objective](field-objective.md).

Skinner Ridge is an exposed rock block (~1 m across) at the base of the lower Rockytop member of the Shenandoah formation, situated at the front of Jezero's western fan. Perseverance drilled two rock cores here: Swift Run and Skyland. The mission reports describe the lithology as fine-to-medium grained sandstone deposited in a deltaic or prodelta setting, with thin, laminated bedding (~1 cm thick or thinner). [PDS Initial Reports Volume 2 Release 2, Section 11][pds]

## Sample records

| Sample    | Public sample no. | Mission designation | Latitude (N) | Longitude (E) | Coring date in PDS | Sealing sol |
| --------- | ----------------: | ------------------- | -----------: | ------------: | ------------------ | ----------: |
| Swift Run |                10 | `M2020-490-11`      |    18.458931 |   77.40617078 | 2022-07-06         |         490 |
| Skyland   |                11 | `M2020-495-12`      |    18.458931 |   77.40617078 | 2022-07-11         |         495 |

Coordinates, coring dates, and sealing sols come from the report headers for Swift Run (section 11) and Skyland (section 12) in [PDS Initial Reports Volume 2 Release 2, Section 11][pds]. The Swift Run core is at 18.458931° N, 77.40617078° E with ground elevation approximately -2523.10 m (-2520.185 m in PDS). A sol is a Martian day. NASA's public sample catalog lists July 7 and July 12 in its date column. Use the explicitly labeled PDS coring dates above if the card shows an Earth date. The sample numbers 10 and 11 come from NASA's public catalog. [PDS Initial Reports, section 11][pds] · [NASA sample catalog][catalog]

## Competing interpretations

The origin and stratigraphic placement of the Skinner Ridge block are subject to competing interpretations:

- **In-place lower Rockytop.** The initial mission report treats Skinner Ridge as likely in place. Its laminated bedding appears parallel to the majority of bedding on the Rockytop scarp, and the rock did not shift during abrasion or coring operations. Sandy regolith banked around the block limits direct basal visibility. [PDS Initial Reports, section 11][pds]
- **Upper Rockytop float block.** Williams et al. (2026), in the section "Classification of Rockytop float rocks", classify Skinner Ridge as a displaced float block originating from the upper Rockytop facies. They argue that Skinner Ridge exhibits alternating protruding and recessive layering closely matching upper Rockytop (such as neighbouring Betty's Rock float) rather than the light-toned, slope-forming lower Rockytop facies, and note compositional affinities in SuperCam and PIXL spectra. [Williams et al. (2026)][williams] · [Williams et al., fig. S3][williams-supplement]

Parallel bedding does not settle the question because a block sliding or slumping a short distance down slope can retain bedding roughly parallel to bedrock. Resolving whether the block is in place or float requires inspecting the contact between the block edge and adjacent rock. [Crew field objective](field-objective.md) · [PDS Initial Reports, section 11][pds]

## Map and card

- Use one Skinner Ridge science-stop pin at the Swift Run sample coordinate. In map data, store the point as longitude then latitude, `[77.40617078, 18.458931]`. Label it as a sample location. The crew's observation position and route endpoint have separate coordinates (for example, standpoint `[77.406155, 18.458908]`, offset southwest on stable footing). [Field observation record](field-observation-record.md)
- List both cores with their mission designations, public sample numbers, and sols. Show **Thornton Gap** (sol 493, 7 mm depth) as the abrasion patch, an area the rover ground down to expose unweathered rock for contact science. [PDS Initial Reports, section 11][pds]
- Use context imagery: NASA PIA24924 shows the regional context of the two sampling sites in Hawksbill Gap, located approximately 20 m apart. Mastcam-Z mosaics and SuperCam Remote Micro-Imager (RMI) natural surface targets around Thornton Gap (Shop Hollow, Sawlog Ridge, Oventop Mountain) provide fine-scale visual textures and spectral calibration. [NASA sampling locations][photo] · [SuperCam Thornton Gap spectra][supercam] · [PDS Initial Reports, section 11][pds]
- The field brief tasks the crew with determining contact continuity at the block margins. If the basal boundary is obscured by loose sandy regolith banked against the block or by shadows, the crew records an unresolved contact result and documents visible layering and facies comparisons without guessing continuity. [Crew field objective](field-objective.md) · [Field observation record](field-observation-record.md)

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[catalog]: https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/
[photo]: https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/
[williams]: https://www.sciencedirect.com/science/article/abs/pii/S0019103526002277
[williams-supplement]: https://authors.library.caltech.edu/records/3jm2k-zn247/files/1-s2.0-S0019103526002277-mmc1.pdf?download=1
[supercam]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00493/scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.xml
