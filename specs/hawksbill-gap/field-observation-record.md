# Hawksbill Gap: field observation record specification

This specification supports [issue #26](https://github.com/Moriae1337/martian-map/issues/26) and implements the field observation schema required by the [Hawksbill Gap crew field objective](field-objective.md). It serves as the data contract for scenario APIs ([#49](../architecture.md)) and field brief generators ([#79](https://github.com/Moriae1337/martian-map/issues/79)).

## Context and purpose

During surface excursions, astronauts and science support teams require an unambiguous, reproducible record distinguishing:

1. **Target / sample location:** where the geological feature or rover sample is situated.
2. **Observer position:** where the astronaut or instrument stood to record the observation.
3. **Observation geometry:** viewing direction, elevation, distance, and physical scale.
4. **Geological observations:** surface condition, two-sided contact measurements, facies comparisons, and the critical contact determination (_continuous_, _separated_, or _unresolved_).

Separating observer position from target/sample coordinates avoids misattributing standoff photography to the sample drill location, especially on uneven Martian terrain or steep scarps.

---

## Field record schema

A field observation record contains the following core fields:

| Field                  | Type             | Description                                                       | Permitted values / format                                                                           |
| ---------------------- | ---------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `id`                   | `string`         | Unique record identifier                                          | Slug format, e.g. `obs-skinner-ridge-contact-01`                                                    |
| `stop_id`              | `string`         | Associated scenario stop                                          | `skinner-ridge` \| `wildcat-ridge`                                                                  |
| `target_name`          | `string`         | Target rock, outcrop, abrasion patch, or contact                  | e.g. `Skinner Ridge block — western contact`                                                        |
| `sample_coordinates`   | `object \| null` | Historical rover sample coordinates if tied to a core/abrasion    | Planetocentric `[longitude, latitude]`, elevation in meters                                         |
| `observer_position`    | `object`         | Standpoint coordinates where crew/camera recorded the observation | Planetocentric `[longitude, latitude]`, ground elevation, eye/camera height                         |
| `viewing_direction`    | `object`         | Azimuth angle and tilt angle of the observation                   | Azimuth in degrees ($0^\circ–360^\circ$ clockwise from True North), tilt ($[-90^\circ, +90^\circ]$) |
| `scale`                | `object`         | Metric scale reference and estimated distance                     | e.g. 2 cm scale bar, target distance (m), mm/pixel                                                  |
| `surface_condition`    | `string`         | Physical surface state of the target                              | `natural` \| `dust_covered` \| `regolith_banked` \| `shadowed` \| `abraded` \| `drill_tailings`     |
| `contact_result`       | `string`         | Geological continuity determination                               | `continuous` \| `separated` \| `unresolved` \| `not_applicable`                                     |
| `contact_measurements` | `object \| null` | Structural measurements across both sides of the contact          | Two-sided bedding protocol: strike/dip, thickness, grain size, way-up                               |
| `unresolved_details`   | `object \| null` | Mandatory details if `contact_result` is `unresolved`             | Inspected edges, obscuring cover, missing exposure, next step                                       |
| `supporting_facies`    | `object \| null` | Supporting comparative observations                               | Comparison to Lower Rockytop and Upper Rockytop facies                                              |
| `sources`              | `array`          | Citations and evidence provenance                                 | PDS reports, DOI citations, image IDs (e.g. PIA numbers)                                            |

### Contact result definitions

- **`continuous`**: The visible beds trace seamlessly across the block edge into adjacent Lower Rockytop bedrock at the same level and attitude. Confirms the block is _in place_.
- **`separated`**: The underside or base of the block is exposed resting on regolith or a disparate geological unit, or layers truncate discordantly against tilted bedrock. Confirms the block is _float_.
- **`unresolved`**: The contact interface is obscured (by banked sandy regolith, talus, dust, or severe shadow) or outside the line of sight. Parallel bedding alone or surface cracks cannot resolve continuity.
- **`not_applicable`**: Used for reference stops (e.g. Wildcat Ridge) where the field question focuses on veins and sedimentary structures rather than block contact continuity.

### Two-sided bedding protocol (ASUALT protocol)

When bedding is visible across the contact zone, observations are recorded separately for **Block side** and **Outcrop side**:

- **Bedding orientation:** Strike and dip in degrees (e.g. strike $075^\circ$, dip $04^\circ\text{ S}$).
- **Bed thickness & grain size:** Average bed thickness (e.g. ~1 cm) and Wentworth grain size classification (e.g. fine sandstone, mudstone).
- **Way-up (younging direction):** `normal` \| `overturned` \| `not_determinable`. If grading, cross-bedding, or scours are absent on 1 cm beds, the record must explicitly state `not_determinable` rather than guessing.

### Requirements for `unresolved` records

If `contact_result == "unresolved"`:

1. **Inspected edges:** Which margins were examined (e.g. north, west, east, downhill face) and what obscured each.
2. **Obscuring factors:** Description of cover (e.g. loose aeolian regolith banked up to 15 cm, shadow from overhang).
3. **Captured evidence:** Scale imagery acquired despite the covered contact (e.g. visible layering on exposed faces).
4. **Missing exposure:** The exact geological exposure required to resolve the question (e.g. basal contact on western scarp).
5. **Next step:** Actionable guidance for the crew: `defer` to pre-planned turnaround, or proceed to a designated safe alternate standpoint.

---

## Machine-readable JSON contract

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FieldObservationRecord",
  "type": "object",
  "required": [
    "id",
    "stop_id",
    "target_name",
    "observer_position",
    "viewing_direction",
    "scale",
    "surface_condition",
    "contact_result",
    "sources"
  ],
  "properties": {
    "id": { "type": "string" },
    "stop_id": { "type": "string", "enum": ["skinner-ridge", "wildcat-ridge"] },
    "target_name": { "type": "string" },
    "sample_coordinates": {
      "type": ["object", "null"],
      "properties": {
        "sample_name": { "type": "string" },
        "mission_designation": { "type": "string" },
        "longitude_east": { "type": "number" },
        "latitude_north": { "type": "number" },
        "elevation_m": { "type": "number" }
      },
      "required": ["sample_name", "longitude_east", "latitude_north"]
    },
    "observer_position": {
      "type": "object",
      "properties": {
        "standpoint_id": { "type": "string" },
        "longitude_east": { "type": "number" },
        "latitude_north": { "type": "number" },
        "elevation_m": { "type": "number" },
        "instrument_height_m": { "type": "number" }
      },
      "required": ["longitude_east", "latitude_north", "elevation_m", "instrument_height_m"]
    },
    "viewing_direction": {
      "type": "object",
      "properties": {
        "azimuth_deg": { "type": "number", "minimum": 0, "maximum": 360 },
        "pitch_deg": { "type": "number", "minimum": -90, "maximum": 90 }
      },
      "required": ["azimuth_deg"]
    },
    "scale": {
      "type": "object",
      "properties": {
        "reference_scale": { "type": "string" },
        "distance_to_target_m": { "type": "number" },
        "spatial_resolution": { "type": "string" }
      },
      "required": ["reference_scale", "distance_to_target_m"]
    },
    "surface_condition": {
      "type": "string",
      "enum": [
        "natural",
        "dust_covered",
        "regolith_banked",
        "shadowed",
        "abraded",
        "drill_tailings"
      ]
    },
    "contact_result": {
      "type": "string",
      "enum": ["continuous", "separated", "unresolved", "not_applicable"]
    },
    "contact_measurements": {
      "type": ["object", "null"],
      "properties": {
        "block_side": {
          "type": "object",
          "properties": {
            "strike_deg": { "type": "number" },
            "dip_deg": { "type": "number" },
            "bed_thickness_cm": { "type": "number" },
            "grain_size": { "type": "string" },
            "younging_direction": {
              "type": "string",
              "enum": ["normal", "overturned", "not_determinable"]
            }
          }
        },
        "outcrop_side": {
          "type": "object",
          "properties": {
            "strike_deg": { "type": "number" },
            "dip_deg": { "type": "number" },
            "bed_thickness_cm": { "type": "number" },
            "grain_size": { "type": "string" },
            "younging_direction": {
              "type": "string",
              "enum": ["normal", "overturned", "not_determinable"]
            }
          }
        }
      }
    },
    "unresolved_details": {
      "type": ["object", "null"],
      "properties": {
        "inspected_edges": { "type": "array", "items": { "type": "string" } },
        "obscuring_cover": { "type": "string" },
        "captured_features": { "type": "string" },
        "missing_exposure": { "type": "string" },
        "next_step": { "type": "string" }
      }
    },
    "supporting_facies": {
      "type": ["object", "null"],
      "properties": {
        "facies_observed": { "type": "string" },
        "comparison_reference": { "type": "string" },
        "correlation_notes": { "type": "string" }
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "citation": { "type": "string" },
          "url": { "type": "string" }
        },
        "required": ["title", "citation"]
      }
    }
  }
}
```

---

## Example: Unresolved contact observation at Skinner Ridge

The following concrete example satisfies the acceptance criteria:

1. **Observer position differs from sample coordinates**:
   - _Sample coordinate (Swift Run core):_ `18.458931° N, 77.40617078° E`, elev `-2523.10 m`.
   - _Observer standpoint (`standpoint-skinner-south`):_ `18.458908° N, 77.406155° E`, elev `-2522.95 m`, offset ~2.7 m southwest on stable footing, with eye/camera height 1.50 m.
2. **Records an `unresolved` result** with full details documenting regolith cover, parallel bedding caveat, and next steps.

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
      "Western margin: inspected from 2.7 m standoff; basal contact banked with sandy regolith.",
      "Southern face: exposed thin bedding photographed with scale.",
      "Eastern margin: crack and overhang observed per PDS section 11; base obscured by shadows."
    ],
    "obscuring_cover": "Fine-grained sandy regolith and windblown dust banked 10–15 cm against the western and northern base of the 1 m block.",
    "captured_features": "Planar bedding on south-facing exposure (~1 cm thickness). Bedding parallels adjacent lower Rockytop slope, but contact plane cannot be traced into bedrock.",
    "missing_exposure": "Unbroken physical contact between the basal layer of the block and the underlying lower Rockytop bedrock surface.",
    "next_step": "Do not classify block as in-place based on parallel bedding. Retain 'origin unresolved' in the planner brief. Defer excavation to mission EVA protocols; verify whether standoff position 2 on northern scarp offers line of sight."
  },
  "supporting_facies": {
    "facies_observed": "Alternating protruding and recessive weathering layers; sandstone with resistant laminae.",
    "comparison_reference": "Williams et al. (2026) figure S3 (Upper Rockytop facies reference) vs figure 3C (Lower Rockytop recessive facies).",
    "correlation_notes": "Layer morphology and SuperCam composition resemble Upper Rockytop (similar to Betty's Rock float), providing supporting evidence for float interpretation, but cannot override the unresolved physical contact."
  },
  "sources": [
    {
      "title": "Mars 2020 Initial Reports, Volume 2, Section 11 (Swift Run)",
      "citation": "PDS Geosciences Node, Mars 2020 Initial Reports Release 2",
      "url": "https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf"
    },
    {
      "title": "Williams et al. (2026) — Classification of Rockytop float rocks",
      "citation": "Icarus 457, 117161",
      "url": "https://doi.org/10.1016/j.icarus.2026.117161"
    },
    {
      "title": "NASA Photojournal PIA24924: 2 Perseverance Sampling Locations in Jezero's Delta",
      "citation": "NASA/JPL-Caltech",
      "url": "https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/"
    }
  ]
}
```

---

## Acceptance verification checklist (CH26-008)

- [x] Brief fields defined for `stop`, `target`, `observer position`, `viewing direction`, `scale`, `surface condition`, `contact result`, and `source`.
- [x] Clear semantic definitions for `continuous`, `separated`, `unresolved`, and `not_applicable`.
- [x] Incorporates the ASUALT two-sided bedding measurement protocol.
- [x] Example demonstrates that observer position (`[77.406155, 18.458908]`) and sample coordinates (`[77.40617078, 18.458931]`) are distinct.
- [x] Example records an `unresolved` result with the five required items: inspected edges, obscuring cover, captured features, missing exposure, and next step.
