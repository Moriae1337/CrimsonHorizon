# CrimsonHorizon

A web application for the NASA Space Apps Challenge 2026,
**"Interplanetary Survival Guide: Martian Map"**. The goal is to help mission
planners prepare Mars surface exploration routes using NASA geospatial data.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS; npm.
- **Backend:** Python 3.12+, FastAPI, Uvicorn; uv.
- **Testing and CI:** pytest, Node.js test runner, Oxlint, GitHub Actions.
- **Hosting target:** Cloudflare Pages + Render Free.

## Explore Mars

- **2D map:** Browse Mars imagery and landmarks, or open the prepared Hawksbill Gap scenario to compare two excursions in Jezero crater.
- **Route planner:** Place a start, an endpoint, and optional stops in Columbia Hills or Hawksbill Gap. Compare the shortest and lower-risk paths, inspect elevation, and export the routes as GeoJSON.
- **3D site and globe:** Review the same planned route on HiRISE terrain, play back a traverse, or find named features on the Mars globe.
