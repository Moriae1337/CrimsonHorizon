# Hawksbill Gap workspace references

This catalog supplies stop links for [issue #28][issue]. Bosak et al. (2024), section 3.1 and Table 2, identify Wildcat Ridge with the Berry Hollow abrasion and Skinner Ridge with the Thornton Gap abrasion. NASA's annotated site panorama shows both stops about 20 m apart. [Bosak et al.][bosak] · [NASA PIA24924][pia24924]

## Wildcat Ridge

At the base of the exposed Hogwallow Flats member, Wildcat Ridge is the low, pale outcrop in the foreground of figure 3a. The workspace contains the Berry Hollow abrasion and the Hazeltop and Bearwallow core sites. [Bosak et al., figure 3][fig3] · [Wildcat Ridge stop](wildcat-ridge.md)

| Source ID                      | Link label and destination                                                 | Coverage and identifiers                                                                                                                                                                                                                        | Credit                                                                        |
| ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `bosak-2024-fig-3`             | [Wildcat Ridge panorama and Berry Hollow workspace — Bosak figure 3][fig3] | Panel a shows the northwest view from the sampling workspace (sol 518, Mastcam-Z `zcam05842`). Panel b shows the workspace after abrasion and Hazeltop sampling (sol 513, Mastcam-Z `zcam08537`). Panel c shows Berry Hollow (sol 511, WATSON). | Bosak et al. (2024), figure 3, with Perseverance Mastcam-Z and WATSON imagery |
| `tate-wildcat-ridge-workspace` | [Wildcat Ridge workspace — 3D model][wildcat-3d]                           | Wildcat Ridge outcrop. Figure 3b cites Tate (2023d), listed as sol 502 in the paper. The Mastcam-Z profile lists the Wildcat Ridge model as sols 502–518.                                                                                       | C. D. Tate, as cited by Bosak et al.                                          |
| `tate-berry-hollow-abrasion`   | [Berry Hollow abrasion — 3D close-up][berry-3d]                            | Berry Hollow patch. Figure 3c cites Tate (2023e). The figure's sol 511 describes the WATSON panel. The model acquisition sol is unverified.                                                                                                     | C. D. Tate, as cited by Bosak et al.                                          |

## Skinner Ridge

At the base of Lower Rockytop above Hogwallow Flats, Skinner Ridge is the roughly metre-wide block below the layered scarp (крутий уступ). The workspace contains the Thornton Gap abrasion and the Swift Run and Skyland core sites. [Bosak et al., figure 5][fig5] · [Skinner Ridge stop](skinner-ridge.md)

| Source ID                    | Link label and destination                                                 | Coverage and identifiers                                                                                                                                                                                                         | Credit                                                                        |
| ---------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `bosak-2024-fig-5`           | [Skinner Ridge panorama and Thornton Gap workspace — Bosak figure 5][fig5] | Panel a shows the northwest view of Rockytop (sol 459, Mastcam-Z `zcam08479`). Panel b shows the workspace after abrasion and Swift Run sampling (sol 492, Mastcam-Z `zcam08517`). Panel c shows Thornton Gap (sol 482, WATSON). | Bosak et al. (2024), figure 5, with Perseverance Mastcam-Z and WATSON imagery |
| `tate-thornton-gap-abrasion` | [Thornton Gap abrasion — 3D close-up][thornton-3d]                         | Thornton Gap patch, sol 482 per the model citation. Figure 5c cites Tate (2023i).                                                                                                                                                | C. D. Tate, as cited by Bosak et al.                                          |

## External link checks

- **Sketchfab availability.** The paper confirms the stop and target assignments for Tate (2023d), (2023e), and (2023i). The [Mastcam-Z profile][mastcam-sketchfab] lists the Wildcat Ridge workspace and Sketchfab's public index lists [Berry Hollow][berry-index] and [Thornton Gap][thornton-index]. The three individual model pages could not be loaded during the check on 2026-11-14, so interactive viewing and any additional page-specific credit lines still need verification.
- **Oventop Mountain.** Figure 5b cites Tate (2023h) for the Skinner Ridge area. The [linked model][oventop-3d] describes terrain near Hogwallow Flats reconstructed from sols 459–477 and gives the credit NASA/JPL/MSSS/ASU/Cornell. Coverage of the Skinner Ridge workspace and Thornton Gap patch is unverified. Keep the link as regional context in this catalog.
- **Other fan-front models.** Bosak et al. figures 2 and 4 link models of the Amalik and Hidden Harbor areas and their respective Novarupta and Uganik Island abrasions. They represent other sampling sites. [Bosak et al.][bosak]

## Integration

Use the table's source IDs and the two scenario stop IDs (`wildcat-ridge` and `skinner-ridge`) for the evidence records in [#50][issue50]. Use the link labels and credits on their corresponding cards in [#69][issue69]. Test each outbound link from the selected card and check the named workspace or patch against the labels above. Confirm the three Sketchfab viewers in a browser before marking [#28][issue] accepted.

[issue]: https://github.com/Moriae1337/martian-map/issues/28
[issue50]: https://github.com/Moriae1337/martian-map/issues/50
[issue69]: https://github.com/Moriae1337/martian-map/issues/69
[bosak]: https://doi.org/10.1029/2024AV001241
[fig3]: https://static1.squarespace.com/static/5b8453a8c258b4efa28f9ab0/t/66bcd4cdc55a5524295b83f6/1723651278917/Bosak%2Bet%2Bal%2B2024_AGUAdvances_Astrobiological%2BPotential%2Bof%2BRocks%2BAcquired%2Bby%2Bthe%2BPerseverance%2BRover%2Bat%2Ba%2BSedimentary%2BFan.pdf#page=7
[fig5]: https://static1.squarespace.com/static/5b8453a8c258b4efa28f9ab0/t/66bcd4cdc55a5524295b83f6/1723651278917/Bosak%2Bet%2Bal%2B2024_AGUAdvances_Astrobiological%2BPotential%2Bof%2BRocks%2BAcquired%2Bby%2Bthe%2BPerseverance%2BRover%2Bat%2Ba%2BSedimentary%2BFan.pdf#page=9
[pia24924]: https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/
[wildcat-3d]: https://sketchfab.com/3d-models/m2020-zcam-wildcat-ridge-sol-502-aa7a278ba53e428ca8f7103eff79987a
[berry-3d]: https://sketchfab.com/3d-models/mars2020-berry-hollow-abrasion-focused-view-d5e24e8c7bde45f8bb43f9a70ecd2b21
[thornton-3d]: https://sketchfab.com/3d-models/mars2020-thornton-gap-abrasion-sol-482-b188ac8ab373426694ddd65a4698d388
[oventop-3d]: https://sketchfab.com/3d-models/m2020-zcam-oventop-mountain-sol-477-21ddf211a0a84c3f8d563a3d5f9cd4e3
[mastcam-sketchfab]: https://sketchfab.com/Mastcam-Z
[berry-index]: https://sketchfab.com/sitemap/m/2022-08-01
[thornton-index]: https://sketchfab.com/sitemap/m/2022-06-29
