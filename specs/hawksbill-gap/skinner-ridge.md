# Skinner Ridge science stop

This record supports [issue #21](https://github.com/Moriae1337/martian-map/issues/21), [issue #22](https://github.com/Moriae1337/martian-map/issues/22) ([CH26-004]), [issue #24](https://github.com/Moriae1337/martian-map/issues/24) ([CH26-006]), and the [Hawksbill Gap crew field objective](field-objective.md). The field observation card and contact protocol are specified in the [Skinner Ridge contact observation specification](skinner-ridge-observation.md).

Skinner Ridge is an exposed rock block (~1 m across) at the base of the lower Rockytop member of the Shenandoah formation, situated at the front of Jezero's western fan. Perseverance drilled two rock cores here: Swift Run and Skyland. The mission reports describe the lithology as fine-to-medium grained sandstone deposited in a deltaic or prodelta setting, with thin, laminated bedding (~1 cm thick or thinner). [PDS Initial Reports Volume 2 Release 2, Section 11][pds]

See the [Skinner Ridge panorama and 3D references](workspace-references.md#skinner-ridge) for views of the workspace and Thornton Gap abrasion.

## Sample records

| Sample    | Public sample no. | Mission designation | Latitude (N) | Longitude (E) | Coring date in PDS | Sealing sol |
| --------- | ----------------: | ------------------- | -----------: | ------------: | ------------------ | ----------: |
| Swift Run |                10 | `M2020-490-11`      |    18.458931 |   77.40617078 | 2022-07-06         |         490 |
| Skyland   |                11 | `M2020-495-12`      |    18.458931 |   77.40617078 | 2022-07-11         |         495 |

Coordinates, coring dates, and sealing sols come from the report headers for Swift Run (section 11) and Skyland (section 12) in [PDS Initial Reports Volume 2 Release 2, Section 11][pds]. The Swift Run core is at 18.458931° N, 77.40617078° E with ground elevation approximately -2523.10 m (-2520.185 m in PDS). A sol is a Martian day. NASA's public sample catalog lists July 7 and July 12 in its date column. Use the explicitly labeled PDS coring dates above if the card shows an Earth date. The sample numbers 10 and 11 come from NASA's public catalog. [PDS Initial Reports, section 11][pds] · [NASA sample catalog][catalog]

## Competing interpretations

The origin and stratigraphic placement of the Skinner Ridge block are subject to competing interpretations in published mission literature:

- **In-place lower Rockytop member.** The initial mission report treats Skinner Ridge as likely in-place bedrock. Its thin, planar laminated bedding (~1 cm thick or thinner) appears parallel to the prevailing bedding on the broader Rockytop scarp, and the block exhibited complete mechanical stability without shifting or tilting during high-force abrasion and coring operations. Loose sandy regolith banked around the base of the block limited direct basal visibility. [PDS Initial Reports, section 11][pds]
- **Upper Rockytop float block.** Williams et al. (2026), in the section "Classification of Rockytop float rocks", classify Skinner Ridge as a displaced float block originating from the upper Rockytop facies. They base their reclassification on facies and geochemistry: Skinner Ridge exhibits prominent alternating protruding and recessive weathering layers at the ~2 cm scale (illustrated in their fig. S3) closely matching Upper Rockytop bedrock and nearby float rocks like Betty's Rock, whereas the local Lower Rockytop bedrock is light-toned, thin-bedded, and recessive/slope-forming (fig. 3C). In addition, SuperCam and PIXL elemental compositions at the Thornton Gap abrasion patch show strong affinities to Betty's Rock rather than Lower Rockytop. [Williams et al. (2026)][williams] · [Williams et al., fig. S3][williams-supplement]

### Parallel bedding ambiguity and hypothesis distinction

**Parallel bedding fits both hypotheses:**

- A coherent block that slid, translated, or slumped a short distance downslope along a planar detachment or low-angle slope can readily preserve strike and dip roughly parallel to bedrock strata without undergoing rotational back-tilting.
- Therefore, parallel bedding is concordant with both in-place Lower Rockytop bedrock and a slumped Upper Rockytop float block, and cannot discriminate between them.

**Distinguishing the origin hypothesis from observed features:**

- Geologists must distinguish between directly observed physical features (such as ~1 cm laminated bedding, strike/dip, alternating protruding/recessive resistance, and elemental composition) and inferred origin hypotheses (e.g. downslope gravity transport from Upper Rockytop).
- Facies resemblance provides supporting comparative evidence, but cannot prove displacement or provenance without structural proof at the block margins.

## Contact observation protocol

The contact inspection is the deciding observation for resolving the origin of Skinner Ridge:

1. **Deciding observation:** The crew checks whether individual sedimentary beds continue across the block edge into the adjacent Lower Rockytop outcrop at the same elevation, strike, dip, and layering.
   - If beds trace seamlessly across the boundary: outcome is `continuous` (confirms in-place bedrock).
   - If the basal underside rests on regolith/colluvium or beds terminate discordantly: outcome is `separated` (confirms float block).
2. **Protocol for covered or ambiguous contacts:**
   - If the contact boundary is covered by loose sandy regolith or shadowed, the outcome stays explicitly **`unresolved`** (defer rather than guess).
   - The crew and science team must never infer in-place status from parallel bedding, nor infer float status from facies resemblance alone.
   - **Banked regolith or eastern fracture is insufficient to call it detached:** Loose sandy regolith naturally banks against obstacles on Mars and does not establish a basal detachment plane. Similarly, an open fracture or overhang on the eastern flank is a common jointing/erosional feature in intact scarps and does not demonstrate detachment.
   - Full protocol details, two-sided bedding measurements (ASUALT protocol), and mandatory five-item reporting for unresolved outcomes are specified in the [Skinner Ridge contact observation specification](skinner-ridge-observation.md).

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
