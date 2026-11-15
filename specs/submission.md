# CrimsonHorizon — NASA Space Apps Challenge 2026 Project Submission

**Challenge:** [Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=details)  
**Project Title:** CrimsonHorizon  
**GitHub Repository:** [https://github.com/Moriae1337/martian-map](https://github.com/Moriae1337/martian-map)  
**Public Demo Path:** [https://moriae1337.github.io/martian-map/](https://moriae1337.github.io/martian-map/)

---

## 1. Project Summary

CrimsonHorizon is an expedition planning application designed for a two-person astronaut field geology crew preparing an extravehicular activity (EVA) Marswalk across Hawksbill Gap on the western delta front of Jezero Crater. Mars exploration demands rigorous integration of multi-scale remote sensing and in-situ robotic observations before putting human boots on the surface. CrimsonHorizon bridges this operational gap by uniting five distinct datasets—high-resolution orbital imagery, metric digital elevation models, rover reflectance spectroscopy, archival surface atmospheric measurements, and surface radiation telemetry.

The system frames a critical geological dilemma: determining whether the enigmatic sandstone block at Skinner Ridge is in-place lower Rockytop bedrock or a displaced float block that tumbled down from the upper Rockytop scarp. Competing published interpretations (NASA PDS initial mission reports versus Williams et al., 2026) hinge on subtle stratigraphic and textural indicators that orbital assets and robotic rovers could not conclusively resolve. CrimsonHorizon enables mission planners and field crews to weigh two concrete traverse options—a direct 258 m round-trip route to Wildcat Ridge with a stand-off view, versus an extended 345 m route enabling close-range contact inspection—against quantified terrain hazards, multi-scale slope sensitivities (2 m versus 5 m baseline grade calculations), localized caution zones, and suit endurance limits. CrimsonHorizon delivers an actionable, verifiable field brief that guides scientific discovery while rigorously guarding crew safety.

---

## 2. 30-Second Walkthrough Video Storyboard & Script

This 30-second walkthrough storyboard demonstrates the operational workflow from initial site orientation to the final pre-departure EVA go/no-go decision.

| Timecode                           | Storyboard Visual (On-Screen Action)                                                                                                                                                                                                                                                                                                                                                                             | Audio / Voiceover Transcript                                                                                                                                                                                                                      | On-Screen Callouts & Graphics                                                                                                                             |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **00:00 – 00:06** <br> _(0–6 s)_   | **Site Overview & Conditions Card:**<br>Camera glides over Jezero Crater's western delta fan into Hawksbill Gap (77.402°–77.410° E, 18.455°–18.463° N). The UI highlights the environmental conditions card displaying archival Perseverance MEDA weather (sols 490–516: diurnal temperature range −81°C to −18°C, pressure 740–760 Pa) and MSL Curiosity RAD radiation baselines.                               | _"In Hawksbill Gap on Mars, an astronaut crew prepares an extravehicular traverse. Real Perseverance weather and Curiosity radiation baselines define their environmental envelope before stepping onto the delta front."_                        | **Site:** Hawksbill Gap, Jezero Fan<br>**MEDA Weather:** Sols 490–516<br>**Radiation Baseline:** Gale RAD (Contextual)                                    |
| **00:06 – 00:14** <br> _(6–14 s)_  | **Skinner Ridge Science & Competing Hypotheses:**<br>Split screen opens the Skinner Ridge science card. Left panel shows the 1 m sandstone block and the sol 493 Thornton Gap abrasion patch. Right panel displays competing models: initial PDS report (in-place bedrock due to parallel strike/dip) versus Williams et al. 2026 (upper Rockytop float block based on alternating protruding/recessive facies). | _"At Skinner Ridge, science teams dispute whether this sandstone block is in-place delta bedrock or displaced float. Parallel bedding fits both models—only human field inspection of the contact edge can decide its true origin."_              | **Skinner Ridge Block (~1 m)**<br>• Initial PDS: In-place bedrock<br>• Williams 2026: Upper float facies<br>**Test:** Contact continuity                  |
| **00:14 – 00:24** <br> _(14–24 s)_ | **Route Comparison & Crew Safety Layer:**<br>Interactive map displays both paths: Option A (258 m, 13.3 m ascent) and Option B (345 m, 17.8 m ascent). The along-route profile highlights caution zones: steep segments where grade spikes from 15° at a 5 m baseline up to 22° at a 2 m baseline, a 5.2 m connector with DTM discordance, and obstacles around Betty's Rock and the eastern fracture.           | _"The planner compares two routes: a 258-meter path to Wildcat Ridge, or a 345-meter traverse to Skinner Ridge. Multi-scale slope analysis flags steep 22° grades at two-meter sampling, marking caution zones and obstacles before commitment."_ | **Route A:** 258 m (13.3 m ascent)<br>**Route B:** 345 m (17.8 m ascent)<br>**Caution:** Grade 15° (5m) ➔ 22° (2m)<br>**Obstacles:** Boulders & Fractures |
| **00:24 – 00:30** <br> _(24–30 s)_ | **Field Brief & Pre-Departure Decision:**<br>UI generates the concise Field Brief: verified turnaround point, scale photography requirements, and explicit protocol: if regolith banks obscure the contact, the result is logged as 'Unresolved'. The crew accepts Option B with clearance.                                                                                                                      | _"Buying the contact inspection costs eighty-seven extra meters. With caution zones reviewed and the turnaround set, the crew generates their field brief and commits to the traverse."_                                                          | **Decision:** Option B Cleared (+87 m)<br>**Turnaround:** 26_1004 Point<br>**Protocol:** Log 'Unresolved' if covered<br>**Status:** Brief Generated       |

---

## 3. Detailed Project Description

### 3.1 Challenge Framing and Operational Context

NASA's 2026 Space Apps Challenge, _"Interplanetary Survival Guide: Martian Map,"_ tasks participants with creating tools that help humans survive and operate on the Martian surface. While orbital rovers operate on multi-sol planning cycles with minutes of light-time latency, human extravehicular activities (EVAs) operate under severe real-time constraints: finite spacesuit consumables, high metabolic workloads, extreme diurnal temperature swings, unshielded ionizing radiation, and treacherous footing on loose, unpaved regolith.

CrimsonHorizon addresses this challenge by providing an end-to-end tactical planning system tailored for surface geological exploration. It directly implements principles from the National Academies' _Science Strategy for the Human Exploration of Mars_ (2026) and operational lessons from NASA's BASALT (Biologic Analog Science Associated with Lava Terrains) research program.

#### Target Audience and Roles

1. **Primary Audience — Astronaut Field Geologist & Crewmate:**  
   Operating from an exploration habitat or pressurized rover, the crew uses CrimsonHorizon to evaluate candidate excursions before egress. During traverse planning, they inspect high-resolution orbital imagery, study terrain elevation profiles, interrogate calibrated spot reflectance spectra, and configure turnaround milestones. In the field, the crew relies on the lightweight, high-contrast Field Brief to locate observation standpoints, follow contact observation protocols, and document findings without cognitive overload.
2. **Secondary Audience — Science Support Team (SST) & EVA Flight Controllers:**  
   Earth-based or habitat-based science operations centers monitor traverse progress, track metabolic elevation costs against suit reserves, trace geological hypotheses back to archival mission evidence, and prepare contingency alternatives if obstacles force route deferral.
3. **Demo & Analog Audience — Space Apps Evaluators, Analog Astronauts, and Students:**  
   Enables analog mission teams (e.g., at MDRS, CHAPEA, or HI-SEAS) and students to interactively explore authentic Mars 2020 landing site data, test real geological trade-offs, and experience science-driven decision-making.

---

### 3.2 Scientific Contribution: The Hawksbill Gap Dilemma

The primary exploration area is Hawksbill Gap, located along the frontal scarp of Jezero Crater's western fan (centered near 77.406° E, 18.459° N). Here, NASA's Mars 2020 _Perseverance_ rover conducted an intensive science campaign on sols 490–516, collecting sedimentary rock cores that hold vital records of early Martian aqueous environments and astrobiological potential (Bosak et al., 2024; Broz et al., 2024).

```
+-------------------------------------------------------------------------------+
|                           HAWKSBILL GAP GEOLOGY                               |
|                                                                               |
|  [Upper Rockytop Member]  --> Coarse sandstone, alternating protruding/       |
|                               recessive resistant beds (Betty's Rock float)   |
|                                                                               |
|       ▼ (Displaced Float Hypothesis — Williams et al. 2026)                   |
|                                                                               |
|  [Skinner Ridge Block]    --> ~1 m isolated block (Swift Run & Skyland cores) |
|                               Thornton Gap abrasion (Sol 493)                 |
|                               Question: In-place bedrock OR slumped float?    |
|                                                                               |
|  [Lower Rockytop Bedrock] --> Light-toned, thin-bedded, slope-forming         |
|                               (In-Place Bedrock Hypothesis — PDS Rel 2)       |
|                                                                               |
|  [Hogwallow Flats Member] --> Fine-grained mudstones, sulfate veins           |
|                               Berry Hollow abrasion (Sol 515)                 |
|                               Hazeltop (Sol 509) & Bearwallow (Sol 516) cores |
+-------------------------------------------------------------------------------+
```

#### 1. Wildcat Ridge (Reference Stop)

- **Geological Setting:** Located in the Hogwallow Flats member of the delta scarp (18.45863707° N, 77.40588851° E). The formation consists of fine-grained, laminated, sulfate-bearing lacustrine mudstones.
- **Rover Evidence:** _Perseverance_ abraded the Berry Hollow patch on sol 515 and cored Hazeltop (sol 509, public sample #12) and Bearwallow (sol 516, public sample #13).
- **Field Task:** Wildcat Ridge serves as the baseline reference stop. Laminated beds are demonstrably in place. The crew's objective is to observe and photograph calcium-sulfate veins cutting through the sedimentary strata with a metric reference scale. Determining whether sulfate veins cross-cut depositional layering establishes whether secondary fluid alteration occurred post-deposition.

#### 2. Skinner Ridge (Test Stop & Controversy)

- **Geological Setting:** Located approximately 20 m away at the base of the Rockytop scarp (18.458931° N, 77.40617078° E). It comprises a detached block approximately 1 m across, displaying very thin, laminated sandstone bedding (~1 cm thick or thinner).
- **Rover Evidence:** _Perseverance_ abraded Thornton Gap on sol 493 and drilled the Swift Run (sol 490, public sample #10) and Skyland (sol 495, public sample #11) rock cores.
- **The Competing Scientific Interpretations:**
  - _In-Place Lower Rockytop Bedrock (Initial Mission Report):_ The _Mars 2020 Initial Reports, Volume 2, Release 2, Section 11_ interpreted Skinner Ridge as in-place lower Rockytop bedrock because its laminated bedding strike and dip closely parallel the general Rockytop bedrock attitude, and the block exhibited mechanical stability during high-force coring.
  - _Upper Rockytop Displaced Float Block (Williams et al., 2026):_ Williams and colleagues (Icarus 457, 117161, 2026) classified Skinner Ridge as a float block shed from the upper Rockytop facies. Their argument is sedimentological and compositional: Skinner Ridge exhibits prominent alternating protruding and recessive layers matching upper Rockytop exposures (and the adjacent Betty's Rock float block, fig. S3), sharply contrasting with the light-toned, slope-forming lower Rockytop beds. Furthermore, SuperCam VISIR and PIXL elemental analyses indicate compositional affinities with upper Rockytop.
- **Why Parallel Bedding Does Not Settle the Controversy:**  
  A large sandstone slab slumping or sliding down a moderate slope frequently retains its original depositional strike and dip. Thus, structural parallelism is entirely compatible with both hypotheses.
- **The Deciding Field Protocol:**  
  CrimsonHorizon equips the crew with a decisive observation protocol:
  1. _Primary Deciding Test (Contact Observation):_ The crew inspects the physical boundary where the block meets the underlying/adjacent formation. If visible beds extend continuously across the interface into the bedrock bench, the block is confirmed **In Place**. If the basal plane is exposed resting atop unconsolidated regolith, or beds truncate abruptly against discordantly dipping strata, the block is confirmed **Float**.
  2. _Strict Protocol for Obscured Contacts:_ If loose aeolian sand, regolith talus, or deep shadows obscure the contact edge, crew members are instructed **never to guess or infer continuity from parallel beds**. The observation is strictly designated as **Unresolved**, requiring the logging of obscuring factors, captured facies photography, and specific missing exposures for future exploration.

---

### 3.3 Crew Safety Layer & Route Engineering

Astronaut safety is the primary operational constraint. CrimsonHorizon implements an active safety architecture grounded in real Martian physical data.

```
                      ROUTE ELEVATION & GRADE TRADEOFF
Elev (m)
 -2520 |                                                .-. (Skinner Ridge)
       |                                               /   \
 -2524 |                   .--. (Wildcat Ridge)       /     \
       |                  /    \                     /       \
 -2528 |   .----.        /      \___________________/         \________.
       |  /      \______/
 -2532 +--+---------+---------+---------+---------+---------+---------+---> Distance
         0m        50m       100m      150m      200m      250m      300m

       [Option A: 258.01 m RT | Ascent: 13.34 m | Max Grade: 14.8° (5m) / 20.7° (2m)]
       [Option B: 345.28 m RT | Ascent: 17.80 m | Max Grade: 14.9° (5m) / 22.1° (2m)]
```

#### 1. Multi-Scale Slope & Grade Sensitivity (2 m vs. 5 m vs. 10 m)

Spacesuit locomotion is highly vulnerable to micro-topography. Standard orbital slope analyses computed across 10 m or 5 m baselines average out steep localized ledges that could cause astronaut falls. CrimsonHorizon computes along-route grades across multiple baselines:

- **5 m Baseline:** Maximum grade along Option A is 14.82°; Option B measures 14.93°. Both appear well within standard walking limits.
- **2 m Baseline:** At human stride and footing scales, along-route grades surge to **20.69°** on Option A and **22.13°** on Option B.
- **Model Discordance:** On the 5.2 m connector segment of Option A, the primary USGS TRN DTM yields a ~7° grade, whereas the fallback HiRISE SOCET DTM yields a severe ~22° grade. CrimsonHorizon surfaces this discordance directly, refusing to assign an arbitrary "safe" label and designating the segment as an active Caution Zone requiring visual line-of-sight verification.

#### 2. Localized Caution Zones and Obstacles

The map flags specific geohazards:

- _Terrain NoData Gaps:_ Segments lacking valid elevation returns are highlighted to prevent routing across uncharacterized cliffs.
- _Structural Obstacles:_ Identifies hazardous surface obstacles documented in rover images, including large boulder clusters at Betty's Rock, steep scarp talus, and the structural crack and overhang on the eastern margin of Skinner Ridge.

#### 3. Turnaround Point & Return Leg Management

Every excursion models out-and-back round trips. Outbound descents represent strenuous uphill climbs on return when spacesuit life-support consumables are depleted. CrimsonHorizon calculates total cumulative ascent for both legs (Option A: 13.34 m; Option B: 17.80 m) using spherical planetary geometry ($R_\text{Mars} = 3{,}396{,}190\text{ m}$). It establishes explicit turnaround waypoints (`26_1222` for Wildcat Ridge; `26_1004` for Skinner Ridge). If any caution zone remains unreviewed, the planner withholds clearance.

#### 4. Archival Environmental Context (MEDA & RAD)

- **Atmospheric Conditions (Perseverance MEDA):** Displays archival surface pressure (740–760 Pa), ambient atmospheric temperature (−81°C nighttime to −18°C daytime), and wind velocities recorded at Jezero during sols 490–516, anchoring mission thermal margins.
- **Radiation Environment (Curiosity RAD):** Integrates archival dose-rate measurements from MSL's Radiation Assessment Detector (~0.64 mSv/day quiet-sun GCR background). CrimsonHorizon includes an explicit operational disclaimer: _RAD measurements were acquired at Gale Crater (~4.5° S), serving as contextual planetary baseline, not a localized Jezero forecast._

---

### 3.4 Five Integrated Data Types with Citations

CrimsonHorizon satisfies and exceeds the challenge criteria by integrating five distinct NASA and USGS mission data types:

```
+-------------------------------------------------------------------------------------------------------+
|                                    FIVE INTEGRATED DATA TYPES                                         |
+-------------------+-----------------------------------------------------------------------------------+
| 1. Optical        | • USGS HiRISE Orthomosaic (0.25 m/px; DOI: 10.5066/P9REJ9JN)                       |
|                   | • USGS Context Camera (CTX) Orthomosaic (6 m/px; DOI: 10.5066/P9REJ9JN)          |
|                   | • Mastcam-Z Surface Mosaics (PIA24924 context, PIA24928 outcrop, PIA24929 cores)  |
+-------------------+-----------------------------------------------------------------------------------+
| 2. Topographic    | • USGS TRN HiRISE Digital Terrain Model (1 m grid; DOI: 10.5066/P9REJ9JN)         |
|                   | • Along-route profiles & multi-scale grade analysis (2m, 5m, 10m windows)         |
+-------------------+-----------------------------------------------------------------------------------+
| 3. Spectroscopy   | • Mars 2020 SuperCam VISIR Calibrated IR FITS (1.31–2.59 µm reflectance)         |
|                   |   - Berry Hollow Abrasion (Sol 515; PDS Geosciences)                              |
|                   |   - Thornton Gap Abrasion (Sol 493; PDS Geosciences)                              |
+-------------------+-----------------------------------------------------------------------------------+
| 4. Atmospheric    | • Perseverance MEDA Archival Weather Time Series (Sols 490–516)                   |
|                   | • PDS Atmospheres Node (Diurnal temperature, pressure, winds)                     |
+-------------------+-----------------------------------------------------------------------------------+
| 5. Radiation      | • MSL Curiosity RAD Surface Radiation Measurements (Gale Crater baseline)        |
|                   | • Galactic Cosmic Ray (GCR) & Solar Particle Event (SPE) context dose rates       |
+-------------------+-----------------------------------------------------------------------------------+
```

1. **Optical Imagery (Orbital & Ground-Level):**
   - _USGS HiRISE 25 cm Orthomosaic:_ `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`, DOI: [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN). Served via public NASA Mars Trek WMTS.
   - _USGS CTX 6 m Orthomosaic:_ `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0`, DOI: [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN). Context mapping layer.
   - _Perseverance Mastcam-Z Surface Context:_ NASA/JPL-Caltech/ASU/MSSS [PIA24924](https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/) (sampling site pairing), [PIA24928](https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/) (Wildcat Ridge annotations), and [PIA24929](https://www.jpl.nasa.gov/images/pia24929-perseverance-rock-cores-from-wildcat-ridge/) (rock cores).

2. **Topographic & Elevation Data:**
   - _USGS TRN HiRISE DTM Mosaic (1 m grid):_ `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif`, DOI: [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN) (Fergason et al., 2020).
   - _Fallback Model Cross-Check:_ University of Arizona / USGS SOCET DTM `DTEEC_002387_1985_003798_1985_A01`.
   - _Elevation Profiles:_ Exact great-circle arc sampling on Mars reference sphere ($R = 3{,}396{,}190\text{ m}$), generating along-line grades, ascents, and caution markers.

3. **Rover Spectroscopy (SuperCam VISIR):**
   - _Berry Hollow Calibrated IR FITS:_ Mars 2020 SuperCam VISIR calibrated reflectance spectra from sol 515 (Product ID: `urn:nasa:pds:mars2020_supercam:data_calibrated_spectra:scam_0515_0712658963_589_cp2_scam01515_berry_hollow_515_sca_01p01`), DOI: [10.17189/1522646](https://doi.org/10.17189/1522646).
   - _Thornton Gap Calibrated IR FITS:_ Mars 2020 SuperCam VISIR calibrated reflectance spectra from sol 493 (Product ID: `urn:nasa:pds:mars2020_supercam:data_calibrated_spectra:scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01`), DOI: [10.17189/1522646](https://doi.org/10.17189/1522646).
   - Calibrated spectral reflectance across 256 bands (1.31–2.59 µm) confirms clay and hydrated sulfate signatures at Wildcat Ridge versus sandstone mineralogy at Skinner Ridge.

4. **Atmospheric In-Situ Telemetry (Perseverance MEDA):**
   - _NASA PDS Atmospheres Node Archive:_ Mars Environmental Dynamics Analyzer archival records across the Hawksbill Gap campaign (sols 490–516): [MEDA Data Archive](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html). Captures surface ambient thermal cycles, atmospheric pressure, and diurnal wind stress.

5. **Surface Radiation Telemetry (MSL Curiosity RAD):**
   - _Curiosity Radiation Assessment Detector Archive:_ NASA PDS / Space Science Reviews archival measurements: [Radiation Measurements on Mars](https://science.nasa.gov/resource/radiation-measurements-on-mars/).
   - Quantifies ionizing galactic cosmic ray (GCR) dosimetric rates, accompanied by the mandatory planetary context disclaimer regarding Gale Crater localization.

---

## 4. Software Architecture and Technical Implementation

CrimsonHorizon is built as a lean, responsive web application adhering to modern spatial data standards and human-centered design principles:

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, OpenLayers 10. Renders interactive high-resolution Mars map layers, coordinates GeoJSON route displays, visualizes elevation profiles, and formats field briefs.
- **Design System:** Strictly compliant with the project's 3-color palette design system (`#212121` deep charcoal background, `#EBEBEB` high-contrast crisp text, `#8F5A53` Martian rust accent). This ensures optimal visual ergonomics and screen readability under high-ambient-glare EVA visor conditions.
- **Backend:** Python 3.12+, FastAPI, Uvicorn, package-managed with `uv`. Serves static precomputed scenario contracts, executes great-circle route calculations, slices digital elevation models, and validates data manifests.
- **Deployment Infrastructure:** Static frontend hosted on Cloudflare Pages; stateless backend deployed via Render Free (`render.yaml`).

---

## 5. Project Links & Artifacts

- **GitHub Source Code Repository:**  
  [https://github.com/Moriae1337/martian-map](https://github.com/Moriae1337/martian-map)
- **Live Public Application Demo:**  
  [https://moriae1337.github.io/martian-map/](https://moriae1337.github.io/martian-map/)
- **API Scenario Specification:**  
  [specs/scenario-api.md](file:///C:/Users/moria/.gemini/antigravity/worktrees/f9566127-1996-4a34-9f83-a5ceed82eb20/swarm-submission-copy-8a9c60af/specs/scenario-api.md)
- **Field Observation Record Schema:**  
  [specs/hawksbill-gap/field-observation-record.md](file:///C:/Users/moria/.gemini/antigravity/worktrees/f9566127-1996-4a34-9f83-a5ceed82eb20/swarm-submission-copy-8a9c60af/specs/hawksbill-gap/field-observation-record.md)
- **Verified Data Manifest:**  
  [backend/data/hawksbill_gap/manifest.json](file:///C:/Users/moria/.gemini/antigravity/worktrees/f9566127-1996-4a34-9f83-a5ceed82eb20/swarm-submission-copy-8a9c60af/backend/data/hawksbill_gap/manifest.json)

---

## 6. Cited Academic Literature & Mission Documentation

1. **Williams, A. J., et al. (2026).** "Classification of Rockytop float rocks and sedimentological interpretations of the Jezero delta front." _Icarus_, 457, 117161. DOI: [10.1016/j.icarus.2026.117161](https://doi.org/10.1016/j.icarus.2026.117161).
2. **Stack, K. M., et al. (2024).** "Photogeologic map of the Perseverance rover landing site in Jezero crater, Mars." _Journal of Geophysical Research: Planets_, 129(6), e2023JE008187. DOI: [10.1029/2023JE008187](https://doi.org/10.1029/2023JE008187).
3. **Broz, M., et al. (2024).** "Morphology and sedimentology of the western fan deposits in Jezero crater." _Journal of Geophysical Research: Planets_, 129, e2024JE008520. DOI: [10.1029/2024JE008520](https://doi.org/10.1029/2024JE008520).
4. **Kanine, O., et al. (2026).** "Reconciling orbital and rover observations in Jezero Crater." _Earth and Space Science_, 13, e2026EA005086. DOI: [10.1029/2026EA005086](https://doi.org/10.1029/2026EA005086).
5. **Bosak, T., et al. (2024).** "Astrobiological potential and geological history of the Jezero delta deposits." _AGU Advances_, 5, e2024AV001241. DOI: [10.1029/2024AV001241](https://doi.org/10.1029/2024AV001241).
6. **Fergason, R. L., Galuszka, D. M., Hare, T. M., Mayer, D. P., & Redding, B. L. (2020).** _Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic_. U.S. Geological Survey data release. DOI: [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN).
7. **Paige, D. A., et al. (2024).** "Ground-penetrating radar observations of subsurface structures in Jezero Crater." _Science Advances_, 10, eadi8339. DOI: [10.1126/sciadv.adi8339](https://doi.org/10.1126/sciadv.adi8339).
8. **Mars 2020 Science Team (2022).** _Mars 2020 Initial Reports, Volume 2, Release 2_, Sections 11 (Swift Run), 12 (Skyland), 14 (Hazeltop), and 15 (Bearwallow). NASA Planetary Data System (PDS) Geosciences Node. [https://pds-geosciences.wustl.edu/missions/mars2020/](https://pds-geosciences.wustl.edu/missions/mars2020/).
9. **National Academies of Sciences, Engineering, and Medicine (2026).** _Science Strategy for the Human Exploration of Mars_. Washington, DC: The National Academies Press. DOI: [10.17226/28594](https://doi.org/10.17226/28594).
10. **Beaton, K. H., et al. (2019/2020).** "Extravehicular activity science operations and communications architecture during the NASA BASALT analog research project." _Astrobiology_, 19(3), 321–346. DOI: [10.1089/ast.2018.1860](https://doi.org/10.1089/ast.2018.1860).
