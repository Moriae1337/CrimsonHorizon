# Hawksbill Gap: crew field objective

Status: **proposed** for the Space Apps 2026 demo (CH26-001). This is a hackathon
scenario built on archival Mars 2020 data. It is not a mission plan. Stop records,
interpretations, observation specifications, and the field record schema are
defined in the follow-up tickets listed at the end.

## Objective

A two-person crew, made up of an astronaut field geologist and a crewmate, plans a
short out-and-back Marswalk in Hawksbill Gap on the western Jezero delta front.
The crew visits the two sedimentary outcrops that Perseverance cored on sols
490–516 and decides **before departure** whether to spend extra walking time on
the observation most likely to show whether the Skinner Ridge block is in place.

> **Field question.** Is the Skinner Ridge block part of the lower Rockytop
> bedrock beside it, or a float block that came down from upper Rockytop?

## The two stops

The outcrops are about 20 m apart ([NASA PIA24924][photo]). Coordinates, sample
IDs and sols belong to the stop records (#20, #21).

| Stop                                          | What the mission reports                                                                                                                                                                                                                                                                                                    | Role in the scenario                                                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Wildcat Ridge** (Hogwallow Flats member) | Hazeltop and Bearwallow cores. The report describes a horizontally layered, sulfate-bearing coarse mudstone that is "likely to be in place". Calcium-sulfate veins cut the rock. [PDS, section 14][pds]                                                                                                                     | **Reference stop.** The crew sees bedding that the report considers likely in place and records how veins relate to the beds. Veins that cut across the beds formed after deposition (#23). |
| **2. Skinner Ridge** (Lower Rockytop member)  | Swift Run and Skyland cores. The block is about 1 m across, with beds about 1 cm thick or thinner. Its bedding "appears parallel to the majority of bedding on Rockytop", which the report takes to suggest the block is in place. Sandy regolith around the block limits visibility. [PDS, section 11, figs. 3 and 5][pds] | **Test stop.** The origin of the block is disputed (below). The contact between the block and the surrounding rock is the observation the crew is there for (#24).                          |

## Competing interpretations

- **In place.** The initial mission report treats Skinner Ridge as likely in place.
  Its bedding is parallel to most Rockytop bedding, and the rock did not move
  during abrasion and sampling. [PDS, section 11][pds]
- **Float block from upper Rockytop.** Williams et al. (2026) classify Skinner
  Ridge as a float rock that originated in the upper Rockytop facies, in the
  section "Classification of Rockytop float rocks". The argument is facies-based:
  - Skinner Ridge shares alternating protruding and recessive layers with upper
    Rockytop (fig. S3, about 2 cm scale);
  - the light-toned, thin-bedded, slope-forming lower Rockytop facies (their
    fig. 3C) looks different from Skinner Ridge;
  - SuperCam and PIXL compositions are similar to Betty's Rock.

  The mission report already classes neighbouring Betty's Rock as a float block
  of Upper Rockytop. [Williams et al., 2026][williams] ·
  [Williams et al., fig. S3][williams-supplement] · [PDS, section 11][pds]

The displaced-block reading was checked against the article's full-text page on
ScienceDirect. #22 owns the full write-up of both interpretations.

**Why parallel bedding does not settle it.** A block that slid or settled only a
short distance can keep bedding close to parallel with the outcrop, so parallel
bedding fits both interpretations. Williams et al. rely on what the beds look
like, not on their attitude. A field crew can test both: whether the beds
continue into the adjacent rock, and which Rockytop facies the block resembles.
This framing is the team's own and is proposed for review in #22 and #24.

## Discriminating observation

At Skinner Ridge the crew makes two observations. The **contact** observation
decides the question. The **facies** comparison is supporting evidence.

1. **Contact.** Follow individual beds to the edge of the block and record what
   happens where it meets adjacent rock or ground.
2. **Facies.** Compare the block's layering with exposed lower Rockytop nearby
   and with the upper Rockytop reference (fig. S3). Lower Rockytop is
   light-toned, thin-bedded and slope-forming. Upper Rockytop has alternating
   protruding and recessive layers.

| Contact result | What the crew sees                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Continuous** | The same beds continue across the edge into adjacent lower Rockytop outcrop at the same level and attitude, with matching thickness and layering. Supports in place.                                                                                                |
| **Separated**  | The base or underside of the block is exposed, resting on regolith or on a different unit, or its beds end at the edge while the adjacent outcrop's beds are offset or tilted. Supports float.                                                                      |
| **Unresolved** | The contact is not visible or is covered. Regolith banked against the block, or a crack in the block, is not enough to call it separated. The report notes sandy regolith all around the block and a crack and overhang on its eastern side. [PDS, section 11][pds] |

A facies match with upper Rockytop supports the float interpretation, but a
facies match does not replace the contact result. Each result needs scale
photographs of the block edge that was inspected. The record must also store the
observer position separately from the sample coordinates (#26).

**Measurements at both sides of the contact.** These follow the protocol
ASUALT proposed in #19. Where beds are visible on both the block and the
adjacent outcrop, record for each side:

- bedding orientation;
- bed thickness and grain size;
- way-up (younging direction), but only where top-and-bottom indicators
  such as grading or scours are visible. With beds about 1 cm thick on a
  block about 1 m across, these may be absent; record "not determinable"
  rather than guessing.

A reversed bed order on the block or a rotated orientation supports float, in
the same way as the separated result.

**Consequence of the result.** Only a continuous result lets the team use the
Skinner Ridge block and its Swift Run and Skyland cores to extend the local
section, as lower Rockytop bedrock. A separated or unresolved result keeps the
block out of the section, and the map marks its origin as uncertain.

## Decision before departure

The crew chooses whether the excursion includes a **close inspection of the
Skinner Ridge contact**.

| Option                                 | Close look at the contact?                                                                                                                                                                                                                                                                                                             | Preliminary length (#41) |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **A**: Wildcat Ridge only              | No. Skinner Ridge is viewed from a stand-off position. A preliminary line-of-sight check in the project scope could not confirm that the contact is visible from there, and #48 evaluates it. The field question is expected to be **deferred**. Route A includes a proposed 5.2 m connector that has not been reviewed on the ground. | about 258 m round trip   |
| **B**: Wildcat Ridge and Skinner Ridge | Yes. This is the only option that can produce a continuous or separated result.                                                                                                                                                                                                                                                        | about 345 m round trip   |

**Proposed decision rule.** An option is **cleared** when its whole route has
valid terrain coverage and every flagged steep or uncertain segment has been
reviewed (#45, #46). For A, this includes the connector, where the two available
elevation models disagree (about 7° against 22° grade at 2 m sampling, according
to the project scope).

- If B is cleared, choose B.
- If only A is cleared, choose A and state in the brief that the Skinner Ridge
  question is deferred.
- If neither is cleared, the planner shows no recommended option and lists the
  segments that block each one.

The roughly 87 m difference is the price of the observation and is shown to the
planner. The route values are preliminary and are
recomputed in #41 and #43. The final authority for any real excursion would be
on-site assessment and mission procedures.

## If the contact is covered

The crew records the stop as **unresolved**. They do not record "in place" or
"displaced", and they do not upgrade the result on the strength of parallel
bedding, because the mission report already used that evidence. The record must
include:

1. **What was inspected.** Which edges of the block were examined and which were
   covered, and what covered them: sandy regolith, dust, shadow, or no line of
   sight.
2. **Where it was seen from.** Observer position and viewing direction, kept
   separate from the Swift Run sample coordinates.
3. **What was still captured.** Scale photographs of the visible bedding, such
   as the downhill face where the mission report saw bedding, and the facies
   comparison with lower and upper Rockytop, marked as supporting evidence only.
4. **What is missing.** The specific exposure that would decide the question,
   for example "no exposed contact on the western edge at bed level".
5. **Next step.** Either a named alternative viewpoint to try, or a deferral of
   the check. Clearing loose material is a mission-procedure decision and outside
   this prototype.

Bedding measurements from whichever sides were visible go into the record as
well. The map shows the Skinner Ridge block with an "origin unresolved" marker,
and the block is not used to extend the section.

#26 turns these items into the field record schema. Its example must show an
unresolved result.

## Acceptance check (CH26-001)

- [x] Names the two stops: Wildcat Ridge and Skinner Ridge.
- [x] States the decision before departure: whether to include the close
      inspection of the Skinner Ridge contact (option B) or defer it (option A),
      with a proposed decision rule.
- [x] States what the crew records if the contact is covered: an unresolved result
      with five required items.

## Follow-up tickets

#20 and #21 source the stop records. #22 documents the interpretations. #23 and
#24 specify the two observations. #26 defines the field record. #41, #43, #45,
#46 and #48 supply the route metrics this decision uses.

## Sources

- [NASA PIA24924, two sampling locations][photo]
- [Mars 2020 Initial Reports, Volume 2, sections 11 (Swift Run) and 14 (Hazeltop)][pds]
- [Williams et al. (2026), Icarus 457, 117161][williams] ·
  [supplement, fig. S3][williams-supplement]

[photo]: https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/
[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[williams]: https://www.sciencedirect.com/science/article/abs/pii/S0019103526002277
[williams-supplement]: https://authors.library.caltech.edu/records/3jm2k-zn247/files/1-s2.0-S0019103526002277-mmc1.pdf?download=1
