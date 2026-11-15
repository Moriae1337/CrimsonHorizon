# SuperCam products: verification record

This record supports [issue #36](https://github.com/Moriae1337/martian-map/issues/36) (CH26-018). It resolves the two SuperCam observations used at the Hawksbill Gap stops to archived PDS products and records their version, sol, target, measurement condition, wavelength coverage, and quality flags. The evidence cards (#50) and spectrum plot (#56) should read their facts from here and from `backend/data/hawksbill_gap/manifest.json` (inputs `supercam-berry-hollow` and `supercam-thornton-gap`).

Verified on 2026-11-14 by downloading each PDS4 label and FITS file from the PDS Geosciences Node and reading them directly. Nothing below comes from secondary summaries unless a citation says so.

## Products

Both products belong to the calibrated spectra collection (`urn:nasa:pds:mars2020_supercam:data_calibrated_spectra`, collection version 16.0) of the Mars 2020 SuperCam bundle (`urn:nasa:pds:mars2020_supercam`, bundle version 9.0, DOI [10.17189/1522646][doi]). The collection inventory lists both LIDVIDs at version 1.2. [Collection inventory][inventory]

| Field                        | Berry Hollow (Wildcat Ridge, Stop 1)                                                                                     | Thornton Gap (Skinner Ridge, Stop 2)                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Logical identifier           | `urn:nasa:pds:mars2020_supercam:data_calibrated_spectra:scam_0515_0712658963_589_cp2_scam01515_berry_hollow_515_sca_01p` | `urn:nasa:pds:mars2020_supercam:data_calibrated_spectra:scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p` |
| Version                      | 1.2 (2025-08-05, "Updated lid_reference for raw data products"); 1.1 2023-07-27; 1.0 2022-11-21                          | Same history                                                                                                             |
| Label title                  | Mars 2020 SuperCam VIS IRSpec CP2 Spectra                                                                                | Same                                                                                                                     |
| Product type                 | CP2 = IRSpec single spectrum, calibrated (CDR) [User guide, CDR list][guide]                                             | Same                                                                                                                     |
| `processing_level`           | Calibrated                                                                                                               | Calibrated                                                                                                               |
| Sol                          | 515 (`sol_number`, `PLANET_DAY_NUMBER`)                                                                                  | 493                                                                                                                      |
| Start time (UTC)             | 2022-08-01T20:56:53.574Z                                                                                                 | 2022-07-10T06:25:19.181Z                                                                                                 |
| Local true solar time        | 12:04:00                                                                                                                 | 12:18:44                                                                                                                 |
| Solar longitude (Ls)         | 277.276°                                                                                                                 | 263.064°                                                                                                                 |
| Target (FITS `TARGETNM`)     | `Berry_Hollow_515_scam`                                                                                                  | `Thornton_Gap_493_scam`                                                                                                  |
| Target database entry        | `TDB_ID` 26956, created sol 510, RMC 26,1222                                                                             | `TDB_ID` 26665, created sol 491, RMC 26,1004                                                                             |
| Rover motion counter at obs. | Site 26, drive 1222                                                                                                      | Site 26, drive 1004                                                                                                      |
| Sequence                     | `scam01515` (`5x1_D_LIBS_MIC_RAMANx2_VISIR_RMI`), raster point 1 of 5                                                    | `scam01493` (`5x1_D_RAMANx2_VISIR_LIBS_MIC_RMI`), raster point 1 of 5                                                    |
| Raw source (EDR)             | `urn:nasa:pds:mars2020_supercam:data_raw_spectra:ls__0515_0712658963_589ep2__0261222scam01515_001_luj.fits`              | `urn:nasa:pds:mars2020_supercam:data_raw_spectra:ls__0493_0710705884_778ep2__0261004scam01493_001_luj.fits`              |
| Pipeline                     | CDRGEN 2.0, pipeline 3.1, CDR date 2022-09-16                                                                            | CDRGEN 2.0, pipeline 3.1, CDR date 2022-09-15                                                                            |
| Telemetry status             | `COMPLETE_CHECKSUM_PASS`                                                                                                 | `COMPLETE_CHECKSUM_PASS`                                                                                                 |
| Label (XML)                  | [label][bh-xml], SHA-256 `3efc7c2a31339f98f76fec42cdf71c03e3cb0f59a0d34aed31bcf311197225fd`                              | [label][tg-xml], SHA-256 `6cf23fcd74e30714d784c9fa81636a874d3fea61cd1e97014ca06bedd82f3a44`                              |
| Data (FITS)                  | [FITS][bh-fits], SHA-256 `dee0cc72ebc135cbf3e0776a7632a2a994fd23368e726a906496b1a1cd1eff39`                              | [FITS][tg-fits], SHA-256 `a49a69245ef0d6ba4a8452585040dab3ae42fe0ded019f0fe8889cc55514f8fd`                              |

The rover motion counters tie each observation to the sample sites already pinned in the manifest: 26_1222 is the Hazeltop waypoint and 26_1004 the Swift Run waypoint (input `m20-waypoints`). The products carry no surface coordinates; place them by stop, not on the map.

## Measurement condition

Both are **passive VISIR (IR spectrometer) spectra of abraded rock**, taken around local noon with the laser off (`LASPOWER` = 0, `VISIR_MD` = `VISIR`).

- **Berry Hollow** is the 8 mm deep abrasion patch on Wildcat Ridge, abraded on sol 504. SuperCam observed it on sol 515, eleven sols later. [PDS Initial Reports, section 14][pds]
- **Thornton Gap** is the 7 mm deep abrasion patch on Skinner Ridge, abraded on sol 482. SuperCam observed it on sol 493, eleven sols later. Note that sol 493 is the SuperCam date, not the abrasion date. [PDS Initial Reports, section 11][pds]

The Initial Reports show these targets inside mean VISIR spectra of natural surfaces, abraded surfaces, and coring tailings (section 11 figure 23, section 14 figure 22). The two products here are single raster points on the abraded surfaces. [PDS Initial Reports][pds]

The `Derived_Geometry` incidence and phase angles in the labels belong to entries named "SuperCam Calibration Target" and "Mars", not to these rock targets. Do not quote them as target viewing geometry.

## Spectral content

Each FITS file has ten HDUs. The spectrum is HDU 6 (`SPECTRA`) with 256 rows and the wavelength grid is HDU 7 (`WAVELENGTH`). [SIS, section 5.4.2][sis]

| Item             | Berry Hollow                  | Thornton Gap                 |
| ---------------- | ----------------------------- | ---------------------------- |
| Wavelength range | 1.31149–2.59002 µm, 256 rows  | 1.31153–2.59010 µm, 256 rows |
| Wavelength order | Descending (row 0 = 2.590 µm) | Descending                   |
| FWHM             | 17.9–58.3 cm⁻¹                | 17.9–58.2 cm⁻¹               |
| `I_F_atm` range  | 0.0528–0.0690                 | 0.3385–0.4991                |
| NaN values       | None in any column            | None                         |

`SPECTRA` columns are `Spectrum DN`, `Radiance`, `I_F`, `I_F_atm`, `F_Sky`, `AtmTrans`. The FITS tables carry no `TUNIT` keywords. The SIS defines `I_F` as reflectance (radiance divided by a modelled solar spectrum for the observation geometry and time) and `I_F_atm` as that reflectance corrected for atmospheric, mainly CO₂, absorption. Both are dimensionless reflectance. [SIS, section 5.1.5][sis]

For plots (#56):

- Sort by wavelength ascending; the file stores it descending.
- Plot `I_F_atm`.
- Shade the 2 µm region. CO₂ residuals may remain after correction there. [PDS Initial Reports, section 11 fig. 23 and section 14 fig. 22][pds]
- Treat data above about 2.55 µm as uncertain. The IRS calibration has temperature sensitivity at those wavelengths. [Same figure captions][pds]
- Compare band shapes, not absolute levels. Berry Hollow reflectance is roughly six times lower than Thornton Gap. The labels give no target illumination geometry, so this record cannot explain the difference.

## Quality flags

HDU 9 (`DATA QUALITY`) holds one row per spectel with `Saturation`, `Glitch`, `Spike` (1 = true, 0 = false, NaN = spectel not used) and `StDev`, the standard deviation of the `I_F` spectrum. Glitches are RF-power artefacts and spikes are 3σ outliers. The pipeline replaces both by interpolating from neighbouring channels. [SIS, sections 5.1.5 and 5.4.2.16][sis]

| Flag       | Berry Hollow                 | Thornton Gap                                                         |
| ---------- | ---------------------------- | -------------------------------------------------------------------- |
| Saturation | 0 of 256                     | 0 of 256                                                             |
| Glitch     | 3: 2.5606, 2.5036, 2.4760 µm | 0                                                                    |
| Spike      | 2: 2.4224, 1.5162 µm         | 8: 2.1778, 2.1637, 1.8733, 1.8477, 1.5727, 1.5028, 1.4299, 1.4269 µm |
| StDev      | 0.00088–0.00200              | 0.00249–0.00381                                                      |

Interpolated channels are still usable, but plots should mark them. The SIS notes that IRSpec products with glitches "may be reprocessed at a later date". Three of the Berry Hollow glitches sit at 2.48–2.56 µm, where the sulfate (2.39 µm) and possible carbonate (2.53 µm) bands are discussed in the Initial Reports. [SIS, section 5.4.2.16][sis]

### Other raster points

Each observation is a 5 × 1 raster. Every point has a CP2 product in the same sol directory. The manifest keeps point 1, so the existing references stay valid. These flag counts help if #56 wants a cleaner point or a mean:

| Point | Berry Hollow, glitch / spike | Thornton Gap, glitch / spike |
| ----- | ---------------------------- | ---------------------------- |
| 1     | 3 / 2                        | 0 / 8                        |
| 2     | 0 / 4                        | 0 / 7                        |
| 3     | 0 / 1                        | 0 / 10                       |
| 4     | 0 / 1                        | 0 / 7                        |
| 5     | 0 / 3                        | 0 / 6                        |

No point is saturated. The collection inventory also lists a sol 518 CP2 observation of Berry Hollow (`scam_0518_0712925258_146_cp2_scam01518_berry_hollow_515_sca_01p`), which this record has not inspected.

## Archive notes

- Release 15 (2026-04-07) reprocessed CP2 products for sols 0–299: thermal calibration, the `StDev` column, and a saturation-flag fix. Both products here are later than sol 299 and already contain `StDev`. Their primary headers report thermal calibration (`DP_TB_ON` = True). [Release notes][notes]
- Release 16 (2026-08-11) reprocessed VIS (CP3) products, not CP2. [Release notes][notes]
- Each observation also has a CP3 (VIS) product with the same name stem (`…_cp3_…_sca_01p02`). This record does not cover those.

## Citation and credit

Cite the bundle and name the instrument team in the UI:

> Wiens, R. C., and Maurice, S. A. (2021). Mars 2020 SuperCam Bundle, version 9.0. NASA Planetary Data System. https://doi.org/10.17189/1522646

Display credit: NASA/JPL-Caltech/LANL/CNES/CNRS, Mars 2020 SuperCam team, NASA PDS Geosciences Node. For the interpretations, cite the Mars 2020 Initial Reports (sections 11 and 14), not this record.

[doi]: https://doi.org/10.17189/1522646
[inventory]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/collection_data_calibrated_spectra_inventory.csv
[guide]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/document/SuperCam_PDS_Userguide.pdf
[sis]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/document/M2020_SuperCam_EDR_RDR_SIS.pdf
[notes]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/document/mars2020_supercam_release_notes.txt
[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[bh-xml]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00515/scam_0515_0712658963_589_cp2_scam01515_berry_hollow_515_sca_01p01.xml
[bh-fits]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00515/scam_0515_0712658963_589_cp2_scam01515_berry_hollow_515_sca_01p01.fits
[tg-xml]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00493/scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.xml
[tg-fits]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00493/scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.fits
