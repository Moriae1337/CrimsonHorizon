# Skinner Ridge: contact observation specification

This specification supports [issue #22](https://github.com/Moriae1337/martian-map/issues/22) ([CH26-004]), [issue #24](https://github.com/Moriae1337/martian-map/issues/24) ([CH26-006]), the [Skinner Ridge science stop](skinner-ridge.md) (#21), and the [Hawksbill Gap crew field objective](field-objective.md) (#120). It defines the field observation card, contact inspection protocols, and field observation records for Stop 2 at Skinner Ridge.

## Geological context

Skinner Ridge is an isolated rock block (~1 m across) situated on a south-facing slope at the base of the lower Rockytop member of the Shenandoah formation, on the western delta front of Jezero crater. The Perseverance rover investigated the block on sols 488–496:

- Ground the **Thornton Gap** abrasion patch (sol 493, depth 7 mm) to expose fresh rock for contact instruments ([PDS Initial Reports, section 11][pds]; [NASA PIA24925][pia24925]).
- Acquired remote spectroscopy and micro-imaging via SuperCam on Thornton Gap and surrounding natural targets (Shop Hollow, Sawlog Ridge, Oventop Mountain) ([SuperCam calibrated spectra][supercam]).
- Successfully drilled and sealed two rock cores: **Swift Run** (public sample no. 10, mission designation `M2020-490-11`, sealed sol 490) and **Skyland** (public sample no. 11, mission designation `M2020-495-12`, sealed sol 495) ([PDS Initial Reports, section 11][pds]; [NASA sample catalog][catalog]).

The lithology of the block is a fine-to-medium grained sandstone displaying prominent thin, laminated planar bedding with individual lamina thicknesses of approximately 1 cm or thinner.

## Competing geological interpretations (CH26-004)

The origin and stratigraphic relationship of the Skinner Ridge block to the surrounding scarp are subject to two competing hypotheses in published mission literature:

```
+-----------------------------------------------------------------------------------------+
|                                COMPETING INTERPRETATIONS                                |
+-----------------------------------------------------------------------------------------+
| 1. In-Place Bedrock (PDS Initial Reports, Vol 2 Rel 2 Section 11)                      |
|    - Thin laminated bedding parallels general Rockytop scarp bedding strike & dip       |
|    - Mechanical stability during abrasion & coring (no shift, tilt, or movement)        |
|    - Interpreted as in-place Lower Rockytop member bedrock                              |
+-----------------------------------------------------------------------------------------+
| 2. Upper Rockytop Float Block (Williams et al., 2026, Icarus 457, 117161; Fig. S3)     |
|    - Facies: Alternating protruding and recessive layers match Upper Rockytop/Betty's   |
|      Rock at ~2 cm scale, distinct from light-toned recessive lower Rockytop (Fig. 3C)  |
|    - Geochemistry: SuperCam LIBS and PIXL elemental signatures match Betty's Rock       |
|    - Interpreted as displaced float block transported downslope by mass wasting         |
+-----------------------------------------------------------------------------------------+
| AMBIGUITY: Parallel bedding fits both hypotheses! Slumped block can preserve strike/dip |
| DECISION: Requires physical contact observation between block edge and adjacent rock   |
+-----------------------------------------------------------------------------------------+
```

### 1. In-place Lower Rockytop member (Initial PDS mission report)

The initial Mars 2020 mission science team report ([PDS Initial Reports Volume 2 Release 2, Section 11][pds]) interprets the Skinner Ridge block as likely in-place bedrock belonging to the Lower Rockytop member:

- **Bedding parallelism:** The laminated bedding (~1 cm thick or thinner) exposed on the downhill face appears parallel to the prevailing regional bedding attitude across the broader Rockytop scarp.
- **Mechanical stability:** The block remained completely stable under rover operations. It showed no measurable shift, rotation, settling, or displacement during high-force tool interactions, including abrasion wheel grinding at Thornton Gap and rotary-percussive core drilling for Swift Run and Skyland.
- **Exposure state:** Direct observation of the basal contact was limited because loose sandy regolith is banked against the base of the block on its western and northern flanks. The mission report relied on structural parallelism to infer that the block is anchored bedrock.

### 2. Displaced Upper Rockytop float block (Williams et al., 2026)

In their comprehensive sedimentological analysis of the delta front, Williams et al. (2026, section "Classification of Rockytop float rocks") reclassify Skinner Ridge as an allochthonous (displaced) float block derived from the stratigraphically higher Upper Rockytop member:

- **Weathering facies and layer morphology:** Skinner Ridge displays alternating protruding (resistant) and recessive (erodible) weathering layers at the ~2 cm scale. As documented in their supplementary Figure S3, this distinctive ribbed profile closely mirrors the Upper Rockytop member and neighbouring recognized Upper Rockytop float rocks such as Betty's Rock.
- **Contrast with Lower Rockytop facies:** The in-situ Lower Rockytop bedrock exposed on the slope around Skinner Ridge consists of light-toned, thin-bedded, recessive, slope-forming siltstone-sandstone (Williams et al., fig. 3C). Skinner Ridge lacks the slope-forming, recessive character of typical Lower Rockytop.
- **Spectroscopic and elemental composition:** SuperCam VISIR/LIBS spectra ([SuperCam spectra][supercam]) and PIXL elemental abundance measurements at Thornton Gap show high compositional affinity to Betty's Rock and Upper Rockytop strata rather than standard Lower Rockytop.

### 3. Critical geological clarification: Parallel bedding ambiguity

**Parallel bedding cannot discriminate between the two hypotheses:**

- A coherent block of rock that detaches from an upslope cliff and slides or slumps a short distance downslope along a low-angle failure plane, planar slip surface, or creeping colluvial mantle can easily maintain its original strike and dip relative to the bedrock scarp.
- In both terrestrial mass-wasting analogs and Martian scarp degradation, translational block slides regularly preserve bedding parallelism without rotational back-tilting.
- Therefore, the observation that bedding inside the Skinner Ridge block parallels the regional Rockytop bedding fits **both** hypotheses equally well:
  1. It fits the in-place hypothesis (bedding is continuous with the scarp).
  2. It fits the float hypothesis (the block translated without tilting).
- Parallel bedding provides zero diagnostic power to decide between bedrock and float.

### 4. Distinguishing the Upper Rockytop origin hypothesis from observed features

Geological rigor requires distinguishing directly observed physical attributes from inferred origin hypotheses:

- **Direct physical observations:**
  - Planar laminated bedding (~1 cm thickness or thinner, strike ~082°, dip ~3.5°).
  - Surface weathering profile showing alternating protruding and recessive ribs (~2 cm scale).
  - Rock competence and lack of internal shear fractures.
  - Elemental composition and reflectance spectra measured at Thornton Gap.
- **Upper Rockytop origin hypothesis:**
  - A conceptual model postulating that the block originated at an Upper Rockytop ledge and was transported downslope via gravity-driven rockfall or translational slumping.
- **Methodological consequence:** A facies match with Upper Rockytop provides strong comparative evidence, but comparative facies alone cannot demonstrate provenance or displacement. Only direct examination of the physical boundary between the block and the adjacent bedrock can confirm or refute in-situ continuity.

---

## Contact observation protocol (CH26-006)

> **Field question.** Is the Skinner Ridge block part of the lower Rockytop bedrock it sits in, or a float block that came down from upper Rockytop?

The contact observation is the primary, deciding observation of Stop 2. The facies comparison is secondary supporting evidence.

### Observation Card

| Attribute                | Value                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stop**                 | Stop 2: Skinner Ridge (Lower Rockytop member)                                                                                                                                                                                             |
| **Field task**           | Inspect contact margins between block and surrounding rock; trace bedding continuity; record two-sided structural measurements                                                                                                            |
| **Sample locations**     | Swift Run (`18.458931° N, 77.40617078° E`) and Skyland (`18.458931° N, 77.40617078° E`)                                                                                                                                                   |
| **Abrasion patch**       | Thornton Gap (sol 493, depth 7 mm)                                                                                                                                                                                                        |
| **Observer standpoints** | Primary: `standpoint-skinner-south` (`18.458908° N, 77.406155° E`, elev -2522.95 m, offset ~2.7 m southwest on stable ground)<br>Alternate: `standpoint-skinner-north` (`18.458955° N, 77.406165° E`, elev -2522.80 m, upper scarp slope) |
| **Context imagery**      | NASA PIA24924 (regional context of sampling sites), PIA24925 (Thornton Gap abrasion), Mastcam-Z mosaics (sol 490)                                                                                                                         |

### Deciding observation: Contact inspection

1. **Trace individual beds to the block edge:**
   - The crew traces individual laminated beds from the exposed southern face toward the lateral margins (western and eastern edges) and the basal contact.
   - The crew checks whether those beds physically continue across the boundary into the adjacent Lower Rockytop outcrop at the identical topographic elevation, dip angle, strike, and bed thickness.

2. **Standardized contact outcomes:**
   - **`continuous`** (Confirms in-place bedrock):
     - The visible beds extend across the margin directly into adjacent Lower Rockytop bedrock without offset, structural discordance, or intervening detrital gap.
     - Confirms that Skinner Ridge is an intact spur or bench of Lower Rockytop member bedrock.
   - **`separated`** (Confirms float block):
     - The base or underside of the block is exposed, resting on unconsolidated regolith, colluvium, or a distinct lower stratigraphic unit; OR
     - The beds terminate abruptly at the edge of the block against discordant, tilted, or non-matching bedrock.
     - Confirms that Skinner Ridge is a detached float block.
   - **`unresolved`** (Contact obscured or ambiguous):
     - The physical contact boundary is obscured by loose sandy regolith, windblown dust, or shadows, or lacks line of sight.
     - The result remains strictly `unresolved`; no inference of continuity or detachment is permitted.

3. **Supporting facies comparison (Secondary evidence):**
   - The crew acquires scale photography comparing the weathering profile of Skinner Ridge to:
     - Upper Rockytop reference facies (Williams et al., fig. S3: alternating protruding and recessive layers).
     - Lower Rockytop reference facies (Williams et al., fig. 3C: light-toned, thin-bedded, slope-forming).
   - _Rule:_ Facies comparison serves as supporting context only. A facies match with Upper Rockytop cannot override an `unresolved` contact result.

4. **Two-sided bedding protocol (ASUALT protocol):**
   Where bedding is visible on both the block and the adjacent outcrop, the crew records measurements separately for **Block side** and **Outcrop side**:
   - **Bedding strike and dip:** Measured in degrees.
   - **Bed thickness and grain size:** Measured in centimeters/millimeters and classified on the Wentworth scale.
   - **Way-up (younging direction):** Recorded as `normal`, `overturned`, or `not_determinable`.
     - _Rule:_ On ~1 cm beds lacking grading, cross-lamination, or scours, way-up is typically absent. The crew must explicitly record `not_determinable` rather than guessing.

---

## Rules for covered, shadowed, or ambiguous contacts

The contact observation protocol enforces strict operational rules to prevent speculative geologic interpretation:

### 1. Defer rather than guess

If the contact plane is covered by loose sandy regolith, windblown dust, or hidden within shadows, the outcome **must stay explicitly `unresolved`**.

- The crew must not assume continuity based on parallel bedding.
- The crew must not assume detachment based on facies dissimilarities.
- The field brief records `origin: unresolved`, and the block is excluded from stratigraphic section extension.

### 2. Banked regolith and eastern fracture are insufficient for detachment

- **Loose sandy regolith banked against the block:**
  - Windblown sand and dust naturally bank against any topographic obstacle on Mars.
  - Regolith banked against the base or sides of the block is a surface obscuration, NOT evidence of an underlying detachment surface.
  - Banked regolith is strictly insufficient to classify the block as separated or float.
- **Eastern fracture and overhang:**
  - The PDS mission report notes an open fracture and overhang on the eastern side of the Skinner Ridge block.
  - Fractures, joints, and erosional alcoves occur ubiquitously within intact bedrock scarps due to thermal cycling, stress release, and differential wind abrasion.
  - An eastern fracture or crack is strictly insufficient to call the block detached or displaced.

### 3. Mandatory 5-item specification for `unresolved` records

Whenever `contact_result == "unresolved"`, the observation record must document the following five mandatory items:

1. **What was inspected:** Identify each margin and face examined (e.g. western lateral margin, southern face, northern scarp contact, eastern fracture).
2. **What obscured the view:** Describe the specific obscuring material or optical condition (e.g. loose sandy regolith banked 10–15 cm high against the western margin; dark shadow within the eastern fracture).
3. **What was captured:** Detail the scale imagery and measurements acquired despite the obstruction (e.g. 2 cm scale photos of south face planar bedding; strike 082° / dip 3.5°; facies comparison photos).
4. **What is missing:** State the precise geological exposure required to resolve the question (e.g. unbroken physical contact between the lowest visible bed of the block and the underlying bedrock bench).
5. **Recommended next step:** Specify the procedural follow-up:
   - Identify whether an alternate vantage point (e.g. `standpoint-skinner-north`) provides line of sight to an exposed contact.
   - Defer excavation or contact clearing to authorized mission EVA procedures; astronauts must not disturb surface regolith unless approved by mission rules.

---

## Field observation records

Field observation records at Skinner Ridge strictly comply with the [field observation record schema](field-observation-record.md).

### Example 1: Standard unresolved contact observation (Current archival state)

This record reflects the realistic condition documented in Mars 2020 mission reports, where banked regolith and shadows obscure the basal contact:

```json
{
  "id": "obs-skinner-ridge-contact-01",
  "stop_id": "skinner-ridge",
  "target_name": "Skinner Ridge block — basal and western contact",
  "sample_coordinates": {
    "sample_name": "Swift Run",
    "mission_designation": "M2020-490-11",
    "longitude_east": 77.40617078,
    "latitude_north": 18.458931,
    "elevation_m": -2523.1
  },
  "observer_position": {
    "standpoint_id": "standpoint-skinner-south",
    "longitude_east": 77.406155,
    "latitude_north": 18.458908,
    "elevation_m": -2522.95,
    "instrument_height_m": 1.5
  },
  "viewing_direction": {
    "azimuth_deg": 38.5,
    "pitch_deg": -12.0
  },
  "scale": {
    "reference_scale": "2 cm gnomon scale bar",
    "distance_to_target_m": 2.7,
    "spatial_resolution": "approx. 0.3 mm/pixel"
  },
  "surface_condition": "regolith_banked",
  "contact_result": "unresolved",
  "contact_measurements": {
    "block_side": {
      "strike_deg": 82.0,
      "dip_deg": 3.5,
      "bed_thickness_cm": 1.0,
      "grain_size": "fine-to-medium sandstone",
      "younging_direction": "not_determinable"
    },
    "outcrop_side": {
      "strike_deg": 85.0,
      "dip_deg": 4.0,
      "bed_thickness_cm": 1.2,
      "grain_size": "fine sandstone",
      "younging_direction": "not_determinable"
    }
  },
  "unresolved_details": {
    "inspected_edges": [
      "Western margin: inspected from 2.7 m standoff; basal contact banked with loose sandy regolith.",
      "Southern face: exposed thin laminated bedding photographed with 2 cm scale.",
      "Eastern margin: fracture and overhang observed per PDS section 11; basal interface obscured by shadow."
    ],
    "obscuring_cover": "Fine-grained sandy regolith and windblown dust banked 10–15 cm against the western and northern base of the 1 m block; deep shadows in eastern alcove.",
    "captured_features": "Planar laminated bedding on south-facing exposure (~1 cm thickness). Bedding parallels adjacent lower Rockytop slope, but contact plane cannot be traced into bedrock.",
    "missing_exposure": "Unbroken physical contact between the basal layer of the block and the underlying lower Rockytop bedrock surface.",
    "next_step": "Do not classify block as in-place based on parallel bedding, and do not classify as float based on banked regolith or eastern fracture. Retain 'origin unresolved' in the planner brief. Defer excavation to mission EVA protocols; verify whether standoff position 2 on northern scarp offers line of sight."
  },
  "supporting_facies": {
    "facies_observed": "Alternating protruding and recessive weathering layers; sandstone with resistant laminae.",
    "comparison_reference": "Williams et al. (2026) figure S3 (Upper Rockytop facies reference) vs figure 3C (Lower Rockytop recessive facies).",
    "correlation_notes": "Layer morphology and SuperCam composition resemble Upper Rockytop (similar to Betty's Rock float), providing supporting evidence for float interpretation, but cannot override the unresolved physical contact."
  },
  "sources": [
    {
      "title": "Mars 2020 Initial Reports, Volume 2 Release 2, Section 11 (Swift Run)",
      "citation": "PDS Geosciences Node, Mars 2020 Initial Reports Release 2, Section 11",
      "url": "https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf"
    },
    {
      "title": "Williams et al. (2026) — Classification of Rockytop float rocks",
      "citation": "Icarus 457, 117161",
      "url": "https://doi.org/10.1016/j.icarus.2026.117161"
    },
    {
      "title": "Williams et al. (2026) Supplementary Information, Figure S3",
      "citation": "Caltech Authors Repository, 1-s2.0-S0019103526002277-mmc1.pdf",
      "url": "https://authors.library.caltech.edu/records/3jm2k-zn247/files/1-s2.0-S0019103526002277-mmc1.pdf?download=1"
    },
    {
      "title": "NASA Photojournal PIA24924: 2 Perseverance Sampling Locations in Jezero's Delta",
      "citation": "NASA/JPL-Caltech/ASU/MSSS",
      "url": "https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/"
    }
  ]
}
```

### Example 2: Hypothetical continuous contact observation (In-place outcome)

This record documents the criteria if an unobstructed contact demonstrates physical continuity into Lower Rockytop bedrock:

```json
{
  "id": "obs-skinner-ridge-contact-02",
  "stop_id": "skinner-ridge",
  "target_name": "Skinner Ridge block — continuous bedrock contact",
  "sample_coordinates": {
    "sample_name": "Swift Run",
    "mission_designation": "M2020-490-11",
    "longitude_east": 77.40617078,
    "latitude_north": 18.458931,
    "elevation_m": -2523.1
  },
  "observer_position": {
    "standpoint_id": "standpoint-skinner-north",
    "longitude_east": 77.406165,
    "latitude_north": 18.458955,
    "elevation_m": -2522.8,
    "instrument_height_m": 1.4
  },
  "viewing_direction": {
    "azimuth_deg": 195.0,
    "pitch_deg": -32.0
  },
  "scale": {
    "reference_scale": "2 cm gnomon scale bar",
    "distance_to_target_m": 1.5,
    "spatial_resolution": "approx. 0.15 mm/pixel"
  },
  "surface_condition": "natural",
  "contact_result": "continuous",
  "contact_measurements": {
    "block_side": {
      "strike_deg": 82.0,
      "dip_deg": 3.5,
      "bed_thickness_cm": 1.0,
      "grain_size": "fine-to-medium sandstone",
      "younging_direction": "not_determinable"
    },
    "outcrop_side": {
      "strike_deg": 82.5,
      "dip_deg": 3.5,
      "bed_thickness_cm": 1.0,
      "grain_size": "fine-to-medium sandstone",
      "younging_direction": "not_determinable"
    }
  },
  "unresolved_details": null,
  "supporting_facies": {
    "facies_observed": "Laminated sandstone benches matching continuous ledges in Lower Rockytop scarp.",
    "comparison_reference": "Continuous bedding trace across northern scarp into bedrock.",
    "correlation_notes": "Physical continuity confirms in-place bedrock status, overriding Upper Rockytop facies resemblance."
  },
  "sources": [
    {
      "title": "Mars 2020 Initial Reports, Volume 2 Release 2, Section 11 (Swift Run)",
      "citation": "PDS Geosciences Node, Section 11",
      "url": "https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf"
    }
  ]
}
```

### Example 3: Hypothetical separated contact observation (Float block outcome)

This record documents the criteria if an unobstructed contact reveals a detached basal surface or truncated bedding:

```json
{
  "id": "obs-skinner-ridge-contact-03",
  "stop_id": "skinner-ridge",
  "target_name": "Skinner Ridge block — basal detachment contact",
  "sample_coordinates": {
    "sample_name": "Swift Run",
    "mission_designation": "M2020-490-11",
    "longitude_east": 77.40617078,
    "latitude_north": 18.458931,
    "elevation_m": -2523.1
  },
  "observer_position": {
    "standpoint_id": "standpoint-skinner-south",
    "longitude_east": 77.406155,
    "latitude_north": 18.458908,
    "elevation_m": -2522.95,
    "instrument_height_m": 1.5
  },
  "viewing_direction": {
    "azimuth_deg": 42.0,
    "pitch_deg": -15.0
  },
  "scale": {
    "reference_scale": "2 cm gnomon scale bar",
    "distance_to_target_m": 2.2,
    "spatial_resolution": "approx. 0.25 mm/pixel"
  },
  "surface_condition": "natural",
  "contact_result": "separated",
  "contact_measurements": {
    "block_side": {
      "strike_deg": 82.0,
      "dip_deg": 3.5,
      "bed_thickness_cm": 1.0,
      "grain_size": "fine-to-medium sandstone",
      "younging_direction": "not_determinable"
    },
    "outcrop_side": {
      "strike_deg": 105.0,
      "dip_deg": 8.0,
      "bed_thickness_cm": 0.5,
      "grain_size": "siltstone",
      "younging_direction": "not_determinable"
    }
  },
  "unresolved_details": null,
  "supporting_facies": {
    "facies_observed": "Exposed basal boundary rests on 5 cm unlithified colluvium above discordant siltstone bedrock; pronounced alternating protruding and recessive layering.",
    "comparison_reference": "Williams et al. (2026) figure S3 and section 'Classification of Rockytop float rocks'.",
    "correlation_notes": "Basal detachment and bedding discordance confirm float classification, strongly supported by Upper Rockytop facies match."
  },
  "sources": [
    {
      "title": "Williams et al. (2026) — Classification of Rockytop float rocks",
      "citation": "Icarus 457, 117161",
      "url": "https://doi.org/10.1016/j.icarus.2026.117161"
    }
  ]
}
```

---

## Acceptance verification checklist (CH26-004 & CH26-006)

- [x] **Documents competing interpretations (CH26-004):**
  - Fully articulates the initial Swift Run report interpretation (PDS Vol 2 Rel 2 Section 11): in-place Lower Rockytop member based on bedding parallelism and rover operational stability.
  - Fully articulates Williams et al. (2026) & Fig. S3 interpretation: float block from Upper Rockytop based on protruding/recessive layering (~2 cm scale), contrast with light-toned slope-forming Lower Rockytop (Fig. 3C), and SuperCam/PIXL composition matching Betty's Rock.
  - Clarifies explicitly that parallel bedding fits both hypotheses (translational slide / slumping without rotational tilt preserves strike/dip).
  - Explicitly distinguishes the Upper Rockytop origin hypothesis from observed physical features.
- [x] **Specifies contact observation protocol (CH26-006):**
  - Designates tracing bed continuity across the block edge into adjacent outcrop as the deciding observation.
  - Mandates that covered or shadowed contacts yield an explicit `unresolved` result (defer rather than guess).
  - Explicitly rules that banked regolith or eastern fracture is insufficient to call the block detached.
  - Details the two-sided bedding protocol across the contact (strike/dip, bed thickness, grain size, way-up / younging direction with explicit `not_determinable`).
  - Distinguishes observer standpoint coordinates from historical rover sample coordinates.
  - Provides complete JSON records matching `field-observation-record.md`.
  - Cites all relevant mission and scientific literature with persistent URLs.

---

## Sources

- [Mars 2020 Initial Reports, Volume 2 Release 2, Section 11 (Swift Run)][pds]
- [Williams et al. (2026), Icarus 457, 117161: Classification of Rockytop float rocks][williams]
- [Williams et al. (2026) Supplementary Information, Figure S3][williams-supplement]
- [NASA Photojournal PIA24924: 2 Perseverance Sampling Locations in Jezero's Delta][photo]
- [NASA Photojournal PIA24925: Perseverance's View of 'Thornton Gap' Abrasion Patch][pia24925]
- [SuperCam Calibrated Spectra: Thornton Gap, Sol 493][supercam]
- [NASA Mars Rock Samples Catalog][catalog]

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[williams]: https://doi.org/10.1016/j.icarus.2026.117161
[williams-supplement]: https://authors.library.caltech.edu/records/3jm2k-zn247/files/1-s2.0-S0019103526002277-mmc1.pdf?download=1
[photo]: https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/
[pia24925]: https://photojournal.jpl.nasa.gov/catalog/PIA24925
[supercam]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00493/scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.xml
[catalog]: https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/
