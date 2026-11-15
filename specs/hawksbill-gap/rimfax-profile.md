# Hawksbill Gap RIMFAX profile

The section is Figure 5b of Stack et al. (2024), _Sedimentology and Stratigraphy of the Shenandoah Formation, Western Fan, Jezero Crater, Mars_. Figure 5a shows the measurement path. The section follows Perseverance east from the Wildcat Ridge stop and then south toward the inferred Máaz formation. [Figure 5, PDF page 10][figure] · [Publication][paper]

## Rover track match

Figure 5a marks the start and four end-of-drive positions. They match the NASA/JPL traverse in order, including the short eastward sol 537 drive and the turn south on sol 538. The traverse lines join at the same rover motion counter (RMC, the mission's localization ID) and coordinates. The four PDS labels independently identify the corresponding calibrated radar products on 22–25 August 2022. [NASA/JPL traverse][traverse] · [RIMFAX archive][pds]

| Sol | Start RMC | End RMC   | Horizontal map distance | PDS calibrated label |
| --- | --------- | --------- | ----------------------: | -------------------- |
| 535 | `26_1222` | `26_1652` |                 84.95 m | [00535][sol535]      |
| 536 | `26_1652` | `26_2018` |                 72.45 m | [00536][sol536]      |
| 537 | `26_2018` | `26_2142` |                 15.45 m | [00537][sol537]      |
| 538 | `26_2142` | `26_2548` |                 91.54 m | [00538][sol538]      |

The section spans about 0–260 m on the published horizontal axis. The rover line measures 264.39 m along the map vertices on the project's Mars reference sphere. This is a drive-interval match. The paper supplies a rendered profile and end-of-drive markers. A column-by-column position or sounding index would require the authors' registration data.

## Depth and coverage

Figure 5 uses nanoseconds of two-way radar travel time and assumes a constant subsurface wave speed of **0.113 m/ns**. The estimated depth below the local surface is `0.113 × Δt / 2` metres, where `Δt` is the two-way delay in nanoseconds relative to the surface return. For example, a 100 ns delay below that return corresponds to about 5.65 m. The negative metre scale drawn at right follows elevation, so the local surface trace sets the depth origin. Paige et al. report 0.113 ± 0.013 m/ns for lower delta sediments. That spread is context for the assumed velocity and does not define a confidence interval for each reflector. [Stack et al., Figure 5][figure] · [Paige et al., Methods and Table 1][velocity]

- Coverage follows the four historical drives. The adjacent drives, areas away from the line, and depths outside the plotted return are outside this profile.
- The white wedge above the sloping surface trace is outside the subsurface record. The published panel and PDS product labels supply no per-sounding gap mask, so gaps within a drive remain unknown.
- From roughly 0 to 40 m the paper identifies strong dipping events as airwaves reflected by the escarpment. That interval contains radar observations and requires care when interpreting the returns. [Stack et al., Figure 5 caption][figure]

## Data and display handoff

[`rimfax_profile.json`][profile] contains the figure reference, historical Mars track, source IDs, depth assumption and coverage notes. The figure is linked at its source. The article allows attributed noncommercial reuse and credits Jet Propulsion Laboratory, California Institute of Technology. [Publication license, PDF page 1][rights]

Run from `backend/` to regenerate the profile. The optional `--traverse PATH` accepts a local copy of the same manifest-pinned NASA/JPL input.

```sh
uv run python -m prep.rimfax_profile
```

#112 can highlight the four GeoJSON features as one interval and use the published figure link. Keep the source depth and coverage notes visible with the profile.

[paper]: https://doi.org/10.1029/2023JE008187
[figure]: https://lamb.caltech.edu/documents/34123/JGR_Planets_-_2024_-_Stack_-_Sedimentology_and_Stratigraphy_of_the_Shenandoah_Formation_Western_Fan_Jezero_Crater_Mars.pdf#page=10
[rights]: https://lamb.caltech.edu/documents/34123/JGR_Planets_-_2024_-_Stack_-_Sedimentology_and_Stratigraphy_of_the_Shenandoah_Formation_Western_Fan_Jezero_Crater_Mars.pdf#page=1
[traverse]: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json
[pds]: https://doi.org/10.17189/1522644
[sol535]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rimfax/data_calibrated/2022/rimfax_calibrated_00535.xml
[sol536]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rimfax/data_calibrated/2022/rimfax_calibrated_00536.xml
[sol537]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rimfax/data_calibrated/2022/rimfax_calibrated_00537.xml
[sol538]: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rimfax/data_calibrated/2022/rimfax_calibrated_00538.xml
[velocity]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10816720/#T1
[profile]: ../../backend/data/hawksbill_gap/rimfax_profile.json
