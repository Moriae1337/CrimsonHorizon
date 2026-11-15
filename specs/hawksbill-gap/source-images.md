# Source images for the two science stops

This record supports [issue #25](https://github.com/Moriae1337/martian-map/issues/25). It picks the NASA images shown on the [Wildcat Ridge](wildcat-ridge.md) and [Skinner Ridge](skinner-ridge.md) cards and records their IDs, sols, credits and alt text. The JSON block at the end is the input for the evidence and provenance records in [issue #50](https://github.com/Moriae1337/martian-map/issues/50).

All links, sols and credit lines were checked against the NASA source pages on 2026-11-14.

## Selection

Each card shows three images: the shared two-stop context, a close-up of the stop's abrasion patch, and the stop's two cores. A fourth workspace image is available for each stop.

| Card          | Role               | Image                                 | Instrument     | Sol(s)   | Credit                    |
| ------------- | ------------------ | ------------------------------------- | -------------- | -------- | ------------------------- |
| Both          | Two-stop context   | [PIA24924][pia24924]                  | Mastcam-Z      | 518      | NASA/JPL-Caltech/ASU/MSSS |
| Skinner Ridge | Abrasion (surface) | [PIA24926][pia24926], left panel      | SHERLOC WATSON | 482      | NASA/JPL-Caltech/ASU/MSSS |
| Skinner Ridge | Cores              | [PIA24927][pia24927]                  | Mastcam-Z      | 490, 495 | NASA/JPL-Caltech/ASU/MSSS |
| Skinner Ridge | Workspace (extra)  | [PIA24925][pia24925], annotated fig A | Mastcam-Z      | 484, 492 | NASA/JPL-Caltech/ASU/MSSS |
| Wildcat Ridge | Abrasion (surface) | [PIA24926][pia24926], right panel     | SHERLOC WATSON | 504      | NASA/JPL-Caltech/ASU/MSSS |
| Wildcat Ridge | Cores              | [PIA24929][pia24929]                  | Mastcam-Z      | 509, 516 | NASA/JPL-Caltech/ASU/MSSS |
| Wildcat Ridge | Workspace (extra)  | [PIA24928][pia24928]                  | Mastcam-Z      | 518      | NASA/JPL-Caltech/ASU/MSSS |

Why these images:

- **One processed release per role.** All six are NASA Photojournal releases from 15 September 2022, with captions that name the stop, the instrument, the sols and the credit. Raw frames carry none of that context.
- **PIA24924 is the two-stop context.** Its annotated figure A labels Wildcat Ridge (lower left) and Skinner Ridge (upper right). The caption says the outcrops are about 20 m apart and the mosaic was taken on sol 518. [PIA24924][pia24924]
- **PIA24926 shows both abrasion patches at the same scale.** WATSON took both panels from about 7 cm away, Skinner Ridge on sol 482 and Wildcat Ridge on sol 504. Each panel has a 5 mm scale bar and is labeled with the patch name (Thornton Gap, Berry Hollow). The sols match the abrasion sols in the mission report (482 for Thornton Gap, 504 for Berry Hollow). [PIA24926][pia24926] · [PDS Initial Reports, sections 11 and 14][pds]
- **The core images show the sampled rock.** PIA24927 shows Swift Run (left, sol 490) and Skyland (right, sol 495). PIA24929 shows Hazeltop (left, sol 509) and Bearwallow (right, sol 516). [PIA24927][pia24927] · [PIA24929][pia24929]

Usage: JPL images may be used without prior permission when credited. Use the credit line from each caption. Do not imply NASA or JPL endorsement, and do not use NASA or JPL logos. [JPL image use policy][policy]

## Alt text

Alt text describes what is visible. The stop name and sol go in the visible caption, so they are not repeated here.

| Image                | Alt text                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIA24924 fig A       | Color panorama across a slope of pale, cracked rock slabs and dark sand toward a layered ridge. Labels mark Wildcat Ridge in the lower left foreground and Skinner Ridge in the upper right, about 20 meters apart.       |
| PIA24926 left panel  | Close-up of a circular patch ground into Skinner Ridge rock, showing a speckled mix of dark, reddish and pale sand grains up to about 2 millimeters across. A 5 mm scale bar is in the corner.                            |
| PIA24926 right panel | Close-up of a circular patch ground into Wildcat Ridge rock, showing a smooth, even, tan surface of very fine grains with a few thin white veins. A 5 mm scale bar is in the corner.                                      |
| PIA24927             | Two end-on views of rock cores held inside the rover's drill bit. Each core is a reddish-brown disk about 13 millimeters wide, flecked with dark and pale grains.                                                         |
| PIA24929             | Two angled views of rock cores held inside the rover's drill bit. The left core is fine-grained and reddish brown; the right core is fine-grained and lighter brown.                                                      |
| PIA24925 fig A       | Color mosaic of the rover's robotic arm reaching over sand toward a pale rock block with a bright circular abrasion patch. Layered cliffs rise behind. Labels mark Rockytop at the top and Skinner Ridge on the block.    |
| PIA24928             | Overhead color mosaic of a pale, cracked rock outcrop among dark sand and loose stones. It shows a bright circular abrasion patch about 5 centimeters across and two smaller drill holes surrounded by gray drill powder. |

Grain sizes and the white veins come from the mission report descriptions of the two patches. [PDS Initial Reports, sections 11 and 14][pds]

## Raw products cited in the mission report

The mission report names some of the underlying raw frames. These are for provenance only; the cards use the Photojournal releases above. The report cites processed products (`RAS`, `FDR`). The public raw-image site serves browse versions of the same observations, with the same sol, spacecraft clock and sequence ID but a different processing code (`EBY`, `ECM`).

| Stop          | Target       | Instrument      | Sol | Product ID cited in the report                            | Raw-image site product                                            |
| ------------- | ------------ | --------------- | --: | --------------------------------------------------------- | ----------------------------------------------------------------- |
| Skinner Ridge | Thornton Gap | SHERLOC WATSON  | 482 | `SIF_0482_0709737248_976RAS_N02621004SRLC01034_0000LMJ01` | [`SIF_0482_0709737248_976EBY_N0261004SRLC01034_0000LMJ`][raw-tg]  |
| Wildcat Ridge | Berry Hollow | SHERLOC WATSON  | 504 | `SIF_0504_0711696567_636FDR_N02621222SRLC01034_0000LMJ01` | [`SIF_0504_0711696567_636EBY_N0261222SRLC01034_0000LMJ`][raw-bh]  |
| Wildcat Ridge | Berry Hollow | Mastcam-Z right | 505 | `ZRF_0505_0711770186_519FDR_N02621222ZCAM03405_1100LMJ01` | [`ZR0_0505_0711770186_519EBY_N0261222ZCAM03405_1100LMJ`][raw-bhz] |

Sources: the report's PIXL raster figures (section 11 figure 12; section 14 figure 12) name these frames as the base images. Its Mastcam-Z context figures also name sequences: Skinner Ridge workspace `zcam08517` (sol 492, section 11 figure 5b) and Wildcat Ridge workspace `zcam08537` (sol 513, section 14 figure 5). [PDS Initial Reports][pds]

Notes:

- The report writes the site and drive as `N0262…`. The raw-image site uses `N026…` (site 26, drives 1004 and 1222). This looks like a typo in the report; the sol, clock and sequence match.
- The report does not say which WATSON frames make up PIA24926. Its sols and 7 cm standoff match the frames above, but treat them as related, not identical.
- Raw frames are credited "NASA/JPL-Caltech" (WATSON) and "NASA/JPL-Caltech/ASU" (Mastcam-Z) on the raw-image site.

## Discrepancies found in other specs

- [skinner-ridge.md](skinner-ridge.md) gives the Thornton Gap abrasion as sol 493. The mission report says the abrasion was done on sol 482. Sol 493 is a SuperCam observation of the patch (section 11 figure 20; the `supercam-thornton-gap` source). [PDS Initial Reports, section 11][pds]
- [wildcat-ridge.md](wildcat-ridge.md) says PIA24928 has labels for both drill holes and Berry Hollow. The published image has no labels; its caption names the features. [PIA24928][pia24928]

These files are left unchanged here so this ticket stays within its scope.

## Machine-readable record

`sources` uses the same fields as the source records in [`backend/data/hawksbill_gap/manifest.json`](../../backend/data/hawksbill_gap/manifest.json). `context-image-pia24924` and `pds-initial-reports` already exist there. The other source records are new.

`images` lists one item per card image. Each item has exactly one `stop_id`, so the shared PIA24924 and the two-panel PIA24926 appear once per stop. `panel` says which part of the source image to show.

```json
{
  "record": "hawksbill-gap-source-images",
  "issue": 25,
  "verified_on": "2026-11-14",
  "sources": [
    {
      "id": "context-image-pia24924",
      "role": "surface-context-image",
      "product_id": "PIA24924",
      "title": "2 Perseverance Sampling Locations in Jezero's Delta",
      "url": "https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/",
      "source_page": "https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "instrument": "Mastcam-Z",
      "sols": [518],
      "acquired_utc_date": "2022-08-04",
      "files": {
        "jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24924/PIA24924.jpg",
        "tif": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24924/PIA24924.tif",
        "annotated_jpg": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia24/pia24924/figures/PIA24924_figA.jpg"
      }
    },
    {
      "id": "abrasion-image-pia24926",
      "role": "abrasion-image",
      "product_id": "PIA24926",
      "title": "2 Abrasion Patches From Perseverance at Jezero Delta",
      "url": "https://science.nasa.gov/photojournal/2-abrasion-patches-from-perseverance-at-jezero-delta/",
      "source_page": "https://science.nasa.gov/photojournal/2-abrasion-patches-from-perseverance-at-jezero-delta/",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "instrument": "SHERLOC WATSON",
      "sols": [482, 504],
      "files": {
        "jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24926/PIA24926.jpg",
        "tif": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24926/PIA24926.tif"
      }
    },
    {
      "id": "core-image-pia24927",
      "role": "core-image",
      "product_id": "PIA24927",
      "title": "Rock Cores From Skinner Ridge",
      "url": "https://science.nasa.gov/photojournal/rock-cores-from-skinner-ridge",
      "source_page": "https://science.nasa.gov/photojournal/rock-cores-from-skinner-ridge",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "instrument": "Mastcam-Z",
      "sols": [490, 495],
      "files": {
        "jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24927/PIA24927.jpg",
        "tif": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24927/PIA24927.tif"
      }
    },
    {
      "id": "workspace-image-pia24925",
      "role": "workspace-image",
      "product_id": "PIA24925",
      "title": "Perseverance Workspace at Skinner Ridge",
      "url": "https://science.nasa.gov/photojournal/perseverance-workspace-at-skinner-ridge",
      "source_page": "https://science.nasa.gov/photojournal/perseverance-workspace-at-skinner-ridge",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "instrument": "Mastcam-Z",
      "sols": [484, 492],
      "files": {
        "jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24925/PIA24925.jpg",
        "tif": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24925/PIA24925.tif",
        "annotated_jpg": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia24/pia24925/figures/PIA24925_figA.jpg"
      }
    },
    {
      "id": "workspace-image-pia24928",
      "role": "workspace-image",
      "product_id": "PIA24928",
      "title": "Sample Collection and Rock Analysis at Wildcat Ridge",
      "url": "https://science.nasa.gov/photojournal/sample-collection-and-rock-analysis-at-wildcat-ridge/",
      "source_page": "https://science.nasa.gov/photojournal/sample-collection-and-rock-analysis-at-wildcat-ridge/",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "instrument": "Mastcam-Z",
      "sols": [518],
      "acquired_utc_date": "2022-08-04",
      "files": {
        "jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24928/PIA24928.jpg",
        "tif": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24928/PIA24928.tif"
      }
    },
    {
      "id": "core-image-pia24929",
      "role": "core-image",
      "product_id": "PIA24929",
      "title": "Perseverance Rock Cores From Wildcat Ridge",
      "url": "https://science.nasa.gov/photojournal/perseverance-rock-cores-from-wildcat-ridge/",
      "source_page": "https://science.nasa.gov/photojournal/perseverance-rock-cores-from-wildcat-ridge/",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "instrument": "Mastcam-Z",
      "sols": [509, 516],
      "files": {
        "jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24929/PIA24929.jpg",
        "tif": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24929/PIA24929.tif"
      }
    },
    {
      "id": "raw-watson-0482-thornton-gap",
      "role": "raw-image",
      "product_id": "SIF_0482_0709737248_976EBY_N0261004SRLC01034_0000LMJ",
      "title": "Mars Perseverance Sol 482: WATSON Camera (Thornton Gap abrasion)",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/00482/ids/edr/browse/shrlc/SIF_0482_0709737248_976EBY_N0261004SRLC01034_0000LMJ01.png",
      "source_page": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_0482_0709737248_976EBY_N0261004SRLC01034_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "license": "NASA/JPL image use policy",
      "instrument": "SHERLOC WATSON",
      "sols": [482],
      "acquired_utc": "2022-06-29T01:21:20.537Z",
      "cited_as": "SIF_0482_0709737248_976RAS_N02621004SRLC01034_0000LMJ01 (PDS Initial Reports, section 11, figure 12)"
    },
    {
      "id": "raw-watson-0504-berry-hollow",
      "role": "raw-image",
      "product_id": "SIF_0504_0711696567_636EBY_N0261222SRLC01034_0000LMJ",
      "title": "Mars Perseverance Sol 504: WATSON Camera (Berry Hollow abrasion)",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/00504/ids/edr/browse/shrlc/SIF_0504_0711696567_636EBY_N0261222SRLC01034_0000LMJ01.png",
      "source_page": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_0504_0711696567_636EBY_N0261222SRLC01034_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "license": "NASA/JPL image use policy",
      "instrument": "SHERLOC WATSON",
      "sols": [504],
      "acquired_utc": "2022-07-21T17:36:54.981Z",
      "cited_as": "SIF_0504_0711696567_636FDR_N02621222SRLC01034_0000LMJ01 (PDS Initial Reports, section 14, figure 12)"
    },
    {
      "id": "raw-mcz-0505-berry-hollow",
      "role": "raw-image",
      "product_id": "ZR0_0505_0711770186_519EBY_N0261222ZCAM03405_1100LMJ",
      "title": "Mars Perseverance Sol 505: Right Mastcam-Z Camera (Berry Hollow abrasion)",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/00505/ids/edr/browse/zcam/ZR0_0505_0711770186_519EBY_N0261222ZCAM03405_1100LMJ01.png",
      "source_page": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZR0_0505_0711770186_519EBY_N0261222ZCAM03405_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "license": "NASA/JPL image use policy",
      "instrument": "Mastcam-Z",
      "sols": [505],
      "acquired_utc": "2022-07-22T14:03:53.566Z",
      "cited_as": "ZRF_0505_0711770186_519FDR_N02621222ZCAM03405_1100LMJ01 (PDS Initial Reports, section 14, figure 12)"
    }
  ],
  "images": [
    {
      "id": "img-skinner-ridge-context",
      "stop_id": "skinner-ridge",
      "role": "two-stop-context",
      "source_ids": ["context-image-pia24924"],
      "file": "annotated_jpg",
      "panel": "full; Skinner Ridge label upper right",
      "subject": "Hawksbill Gap: Wildcat Ridge and Skinner Ridge about 20 m apart",
      "sols": [518],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Color panorama across a slope of pale, cracked rock slabs and dark sand toward a layered ridge. Labels mark Wildcat Ridge in the lower left foreground and Skinner Ridge in the upper right, about 20 meters apart."
    },
    {
      "id": "img-skinner-ridge-abrasion",
      "stop_id": "skinner-ridge",
      "role": "abrasion",
      "source_ids": [
        "abrasion-image-pia24926",
        "pds-initial-reports",
        "raw-watson-0482-thornton-gap"
      ],
      "file": "jpg",
      "panel": "left",
      "subject": "Thornton Gap abrasion patch, about 7 mm deep, WATSON at 7 cm standoff",
      "sols": [482],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Close-up of a circular patch ground into Skinner Ridge rock, showing a speckled mix of dark, reddish and pale sand grains up to about 2 millimeters across. A 5 mm scale bar is in the corner."
    },
    {
      "id": "img-skinner-ridge-cores",
      "stop_id": "skinner-ridge",
      "role": "cores",
      "source_ids": ["core-image-pia24927"],
      "file": "jpg",
      "panel": "full; Swift Run left, Skyland right",
      "subject": "Swift Run and Skyland cores in the drill bit",
      "sols": [490, 495],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Two end-on views of rock cores held inside the rover's drill bit. Each core is a reddish-brown disk about 13 millimeters wide, flecked with dark and pale grains."
    },
    {
      "id": "img-skinner-ridge-workspace",
      "stop_id": "skinner-ridge",
      "role": "workspace",
      "source_ids": ["workspace-image-pia24925"],
      "file": "annotated_jpg",
      "panel": "full",
      "subject": "Skinner Ridge workspace below Rockytop, with the Thornton Gap abrasion patch",
      "sols": [484, 492],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Color mosaic of the rover's robotic arm reaching over sand toward a pale rock block with a bright circular abrasion patch. Layered cliffs rise behind. Labels mark Rockytop at the top and Skinner Ridge on the block."
    },
    {
      "id": "img-wildcat-ridge-context",
      "stop_id": "wildcat-ridge",
      "role": "two-stop-context",
      "source_ids": ["context-image-pia24924"],
      "file": "annotated_jpg",
      "panel": "full; Wildcat Ridge label lower left",
      "subject": "Hawksbill Gap: Wildcat Ridge and Skinner Ridge about 20 m apart",
      "sols": [518],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Color panorama across a slope of pale, cracked rock slabs and dark sand toward a layered ridge. Labels mark Wildcat Ridge in the lower left foreground and Skinner Ridge in the upper right, about 20 meters apart."
    },
    {
      "id": "img-wildcat-ridge-abrasion",
      "stop_id": "wildcat-ridge",
      "role": "abrasion",
      "source_ids": [
        "abrasion-image-pia24926",
        "pds-initial-reports",
        "raw-watson-0504-berry-hollow"
      ],
      "file": "jpg",
      "panel": "right",
      "subject": "Berry Hollow abrasion patch, about 8 mm deep, WATSON at 7 cm standoff",
      "sols": [504],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Close-up of a circular patch ground into Wildcat Ridge rock, showing a smooth, even, tan surface of very fine grains with a few thin white veins. A 5 mm scale bar is in the corner."
    },
    {
      "id": "img-wildcat-ridge-cores",
      "stop_id": "wildcat-ridge",
      "role": "cores",
      "source_ids": ["core-image-pia24929"],
      "file": "jpg",
      "panel": "full; Hazeltop left, Bearwallow right",
      "subject": "Hazeltop and Bearwallow cores in the drill bit",
      "sols": [509, 516],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Two angled views of rock cores held inside the rover's drill bit. The left core is fine-grained and reddish brown; the right core is fine-grained and lighter brown."
    },
    {
      "id": "img-wildcat-ridge-workspace",
      "stop_id": "wildcat-ridge",
      "role": "workspace",
      "source_ids": ["workspace-image-pia24928"],
      "file": "jpg",
      "panel": "full",
      "subject": "Wildcat Ridge outcrop with the Berry Hollow abrasion patch and both drill holes",
      "sols": [518],
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "alt": "Overhead color mosaic of a pale, cracked rock outcrop among dark sand and loose stones. It shows a bright circular abrasion patch about 5 centimeters across and two smaller drill holes surrounded by gray drill powder."
    }
  ]
}
```

## Acceptance check (CH26-007)

- [x] Both cards have identified image sources: a shared context image, an abrasion close-up and a core image for each stop.
- [x] Each image has a subject, sol(s), instrument, credit line and source page.
- [x] Each image has alt text that describes what is visible.
- [x] Figure and product IDs are recorded, including the raw frames the mission report cites.

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[pia24924]: https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/
[pia24925]: https://science.nasa.gov/photojournal/perseverance-workspace-at-skinner-ridge
[pia24926]: https://science.nasa.gov/photojournal/2-abrasion-patches-from-perseverance-at-jezero-delta/
[pia24927]: https://science.nasa.gov/photojournal/rock-cores-from-skinner-ridge
[pia24928]: https://science.nasa.gov/photojournal/sample-collection-and-rock-analysis-at-wildcat-ridge/
[pia24929]: https://science.nasa.gov/photojournal/perseverance-rock-cores-from-wildcat-ridge/
[policy]: https://www.jpl.nasa.gov/jpl-image-use-policy/
[raw-tg]: https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_0482_0709737248_976EBY_N0261004SRLC01034_0000LMJ
[raw-bh]: https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_0504_0711696567_636EBY_N0261222SRLC01034_0000LMJ
[raw-bhz]: https://mars.nasa.gov/mars2020/multimedia/raw-images/ZR0_0505_0711770186_519EBY_N0261222ZCAM03405_1100LMJ
