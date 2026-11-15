# Wildcat Ridge: vein observation specification

This specification supports [issue #23](https://github.com/Moriae1337/martian-map/issues/23), the [Wildcat Ridge science stop](wildcat-ridge.md) (#20), and the [Hawksbill Gap crew field objective](field-objective.md) (#120). It defines the field observation card and crew procedures for Stop 1 at Wildcat Ridge.

## Geological context

Wildcat Ridge is an exposed rock outcrop in the Hogwallow Flats member at the front of Jezero crater's western delta. Perseverance investigated this outcrop during sols 505–516, grinding the **Berry Hollow** abrasion patch and extracting two rock core samples: **Hazeltop** (public sample no. 12, `M2020-509-14`, sealed sol 509) and **Bearwallow** (public sample no. 13, `M2020-516-15`, sealed sol 516) ([PDS Initial Reports, sections 14 and 15][pds]).

The host rock consists of fine-grained, sulfate-bearing laminated mudstone to coarse siltstone interpreted as deltaic sediment likely in place. Prominent light-toned calcium-sulfate veins (gypsum, bassanite, or anhydrite) cut through the rock ([PDS Initial Reports, section 14][pds]).

## Field question

> **Field question.** Do the calcium-sulfate veins cut across sedimentary bedding, demonstrating post-depositional fracture precipitation, or are they concordant with bedding?

Determining whether the veins cross-cut or parallel sedimentary bedding resolves the timing of aqueous activity relative to sediment deposition:

- **Cross-cutting veins** cross bedding laminae at an angle, proving that fractures opened and mineral-bearing fluids circulated _after_ the deltaic muds were deposited and lithified (post-depositional diagenesis).
- **Concordant veins** run parallel to bedding planes (as bedding-parallel sheets or sills), suggesting mineral precipitation occurred along depositional layering, possibly syndepositional or early diagenetic.

## Observation card

The Wildcat Ridge observation card defines the field task for the astronaut field geologist and crewmate.

| Attribute            | Value                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Stop**             | Stop 1: Wildcat Ridge (Hogwallow Flats member)                                                |
| **Target feature**   | Calcium-sulfate veins and surrounding sedimentary bedding                                     |
| **Sample locations** | Hazeltop (`18.45863707° N, 77.40588851° E`) and Bearwallow (`18.45863832° N, 77.40588685° E`) |
| **Abrasion patch**   | Berry Hollow (shared abrasion patch on Hazeltop block, sol 508)                               |
| **Context imagery**  | NASA PIA24928 (annotated Mastcam-Z outcrop mosaic) and PIA24929 (drill cores)                 |

### Instructions to the crew

1. **Scale photography:**
   - Photograph an exposed vein and the adjacent laminated host rock with a metric scale reference (e.g. 2 cm scale bar or gnomon).
   - Capture both context images showing the relation to outcrop bedding and high-resolution close-ups resolving millimeter-scale laminations and vein margins.
   - Verify that the contact zone between the vein and bedding is in sharp focus and free from hand, body, or spacesuit shadows.

2. **Record spatial relationship:**
   Record the structural relationship between the vein and host bedding as one of three standardized values:
   - `cross_cutting`: The vein cuts across sedimentary bedding planes at an angle, demonstrating fracture fill formed after sediment deposition.
   - `concordant`: The vein runs parallel to sedimentary bedding laminae without truncating layers.
   - `unresolved`: The geometric relationship between the vein and bedding cannot be determined because the contact is obscured, ambiguous, or lacks line of sight.

3. **Document surface condition:**
   Record the physical condition of the inspected rock surface:
   - `abraded`: Inspected on the Berry Hollow abrasion patch, exposing unweathered rock and pristine vein cross-sections.
   - `natural`: Inspected on the natural, weathered outcrop scarp face.
   - Document any obscuring or modifying surface factors: windblown dust coating, loose sandy regolith, shadows from local micro-topography, or drill tailings from the Hazeltop or Bearwallow boreholes.

4. **Measure vein thickness and orientation:**
   - Measure vein thickness using the scale reference (typically millimeter- to centimeter-scale; fine micro-veins in Berry Hollow are 1–3 mm thick per PDS section 14).
   - Measure vein orientation (strike and dip) relative to the local horizontal or sub-horizontal bedding attitude.
   - Document vein morphology (e.g. planar fracture fill, branching network, anastomosing stringers, or tapering tips).

## Outcome for unclear or covered features

If the contact between a vein and sedimentary bedding is obscured by windblown dust, loose regolith, shadow, or drill tailings, the crew must record the relationship as **`unresolved`**.

The crew must not infer a cross-cutting or concordant relationship from discontinuous exposures or assumed extensions. An `unresolved` record requires the following five items:

1. **What was inspected:** Identify the specific vein exposure, rock face, or abrasion quadrant examined (e.g. "Vein segment 3 on lower scarp face south of Berry Hollow").
2. **What obscured the view:** Describe the obscuring material or condition (e.g. "Vein-bedding intersection blanketed by 5 mm of loose windblown dust and drill tailings from Hazeltop coring").
3. **What was captured:** Describe the scale imagery acquired despite the obstruction (e.g. "Photographed 4 cm of vein trace across exposed upper face and laminated bedding 3 cm above contact with 2 cm scale bar").
4. **What is missing:** State the critical observation needed to decide the question (e.g. "Physical contact plane where vein intersects host rock bedding laminae is not exposed").
5. **Recommended next step:** Specify the recommended follow-up:
   - Identify whether an alternative viewpoint (e.g. adjacent rock face or cleaner surface on the Berry Hollow abrasion patch) or stand-off verification is recommended.
   - If no alternate viewpoint is available without disturbing surface material, flag for mission EVA review; do not clear regolith or dust manually unless authorized by procedure.

## Field observation records

Observations at Wildcat Ridge conform to the [field observation record schema](field-observation-record.md).

### Example 1: Verified cross-cutting vein at Berry Hollow

This record documents a clear cross-cutting vein observed on the Berry Hollow abrasion patch:

```json
{
  "id": "obs-wildcat-ridge-vein-01",
  "stop_id": "wildcat-ridge",
  "target_name": "Wildcat Ridge — Berry Hollow calcium-sulfate vein",
  "sample_coordinates": {
    "sample_name": "Hazeltop",
    "mission_designation": "M2020-509-14",
    "longitude_east": 77.40588851,
    "latitude_north": 18.45863707,
    "elevation_m": -2526.4
  },
  "observer_position": {
    "standpoint_id": "standpoint-wildcat-west",
    "longitude_east": 77.405872,
    "latitude_north": 18.458632,
    "elevation_m": -2526.25,
    "instrument_height_m": 1.2
  },
  "viewing_direction": {
    "azimuth_deg": 65.0,
    "pitch_deg": -28.0
  },
  "scale": {
    "reference_scale": "2 cm gnomon scale bar",
    "distance_to_target_m": 0.8,
    "spatial_resolution": "approx. 0.1 mm/pixel"
  },
  "surface_condition": "abraded",
  "contact_result": "not_applicable",
  "spatial_relationship": "cross_cutting",
  "vein_measurements": {
    "thickness_mm": 2.5,
    "strike_deg": 142.0,
    "dip_deg": 74.0,
    "bedding_strike_deg": 88.0,
    "bedding_dip_deg": 3.0,
    "morphology": "planar micro-vein cutting across sub-millimeter laminated mudstone"
  },
  "sources": [
    {
      "title": "Mars 2020 Initial Reports, Volume 2 Release 2, Section 14 (Hazeltop)",
      "citation": "PDS Geosciences Node, figs. 5, 21–22",
      "url": "https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf"
    },
    {
      "title": "NASA Photojournal PIA24928: Sample Collection and Rock Analysis at Wildcat Ridge",
      "citation": "NASA/JPL-Caltech, sol 518",
      "url": "https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/"
    },
    {
      "title": "NASA Photojournal PIA24929: Perseverance Rock Cores from Wildcat Ridge",
      "citation": "NASA/JPL-Caltech",
      "url": "https://www.jpl.nasa.gov/images/pia24929-perseverance-rock-cores-from-wildcat-ridge/"
    }
  ]
}
```

### Example 2: Unresolved vein observation due to dust cover

This record documents an observation where dust and drill tailings obscure the contact:

```json
{
  "id": "obs-wildcat-ridge-vein-02",
  "stop_id": "wildcat-ridge",
  "target_name": "Wildcat Ridge — south scarp vein contact",
  "sample_coordinates": {
    "sample_name": "Hazeltop",
    "mission_designation": "M2020-509-14",
    "longitude_east": 77.40588851,
    "latitude_north": 18.45863707,
    "elevation_m": -2526.4
  },
  "observer_position": {
    "standpoint_id": "standpoint-wildcat-south",
    "longitude_east": 77.405881,
    "latitude_north": 18.458625,
    "elevation_m": -2526.3,
    "instrument_height_m": 1.4
  },
  "viewing_direction": {
    "azimuth_deg": 12.0,
    "pitch_deg": -22.0
  },
  "scale": {
    "reference_scale": "2 cm gnomon scale bar",
    "distance_to_target_m": 1.1,
    "spatial_resolution": "approx. 0.15 mm/pixel"
  },
  "surface_condition": "dust_covered",
  "contact_result": "not_applicable",
  "spatial_relationship": "unresolved",
  "unresolved_details": {
    "inspected_features": "Natural scarp face 20 cm south of Hazeltop borehole; light-toned linear feature extending toward laminated bed",
    "obscuring_cover": "Windblown reddish dust and drill tailings banked ~1 cm deep over the vein-bedding contact zone; scarp overhang casts shadow across lower interface",
    "captured_features": "Scale imagery of 3 cm vein trace on upper scarp and flat-lying laminated mudstone beds 4 cm to the west",
    "missing_exposure": "Clear intersection between the vein margin and sedimentary bedding laminae",
    "next_step": "Recommend inspecting adjacent rock face 30 cm north or the Berry Hollow abrasion patch where dust cover is minimal; perform stand-off verification from standpoint-wildcat-west"
  },
  "sources": [
    {
      "title": "Mars 2020 Initial Reports, Volume 2 Release 2, Section 14 (Hazeltop)",
      "citation": "PDS Geosciences Node, figs. 5, 21–22",
      "url": "https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf"
    },
    {
      "title": "NASA Photojournal PIA24928: Sample Collection and Rock Analysis at Wildcat Ridge",
      "citation": "NASA/JPL-Caltech, sol 518",
      "url": "https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/"
    }
  ]
}
```

## Acceptance verification checklist (CH26-005)

- [x] Includes the core field question regarding cross-cutting vs concordant calcium-sulfate veins.
- [x] Specifies the field observation to record: scale photography, spatial relationship (`cross_cutting`, `concordant`, `unresolved`), surface condition (`natural` vs `abraded`, dust, tailings, regolith), and vein thickness/orientation measurements.
- [x] Specifies the outcome for unclear or covered features: protocol for recording `unresolved`, mandatory details (inspected features, obscuring factors, captured features, missing exposure, next step / alternative viewpoint / stand-off verification).
- [x] Cites relevant mission sources (PDS Initial Reports Volume 2 Release 2, Section 14 [Hazeltop, figs. 5, 21–22], NASA PIA24928, and NASA PIA24929).

## Sources

- [Mars 2020 Initial Reports, Volume 2 Release 2, Section 14 (Hazeltop, figs. 5, 21–22) and Section 15 (Bearwallow)][pds]
- [NASA PIA24928: Sample Collection and Rock Analysis at Wildcat Ridge][mosaic]
- [NASA PIA24929: Perseverance Rock Cores from Wildcat Ridge][cores]
- [NASA Mars Rock Samples Catalog][catalog]

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[mosaic]: https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/
[cores]: https://www.jpl.nasa.gov/images/pia24929-perseverance-rock-cores-from-wildcat-ridge/
[catalog]: https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/
