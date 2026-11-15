# CrimsonHorizon

A web application for the NASA Space Apps Challenge 2026,
**"Interplanetary Survival Guide: Martian Map"**. The goal is to help mission
planners prepare Mars surface exploration routes using NASA geospatial data.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS; npm.
- **Backend:** Python 3.12+, FastAPI, Uvicorn; uv.
- **Testing and CI:** pytest, Node.js test runner, Oxlint, GitHub Actions.
- **Hosting target:** Cloudflare Pages + Render Free.

## Current status

The application foundation is ready:

- Landing page with backend connection status and error handling.
- API endpoints: `GET /` and `GET /health`.
- Environment configuration and restricted CORS.
- Automated tests, build and lint checks, and backend deployment configuration.

Maps, Mars dataset integration, GIS processing, and route planning are not implemented yet.
