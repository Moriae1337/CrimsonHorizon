# CrimsonHorizon architecture

## Overview

CrimsonHorizon is a two-part web application: a static single-page frontend and a
stateless JSON API backend. They live in one GitHub monorepo and are deployed
independently.

```
                ┌──────────────────────────┐
  User browser ─┤ Cloudflare Pages         │  static files (HTML/JS/CSS)
                │ frontend/ (React + Vite) │
                └────────────┬─────────────┘
                             │ fetch requests to VITE_API_URL over HTTPS
                             ▼
                ┌──────────────────────────┐
                │ Render Free web service  │  FastAPI + Uvicorn
                │ backend/ (Python 3.12)   │  CORS restricted by CORS_ORIGINS
                └──────────────────────────┘
```

There is no database, cache, queue, or authentication. The backend holds no state.

## Responsibilities

### Frontend (`frontend/`)

- Renders the user interface (interactive Mars surface map and expedition controls).
- Calls the backend over HTTP. The base URL comes from `VITE_API_URL` at build time.
- Shows loading, success, and error states for every backend call.
- `App.tsx` switches between the OpenLayers map and the Three.js terrain and globe views.
  `useRoutePlanner.ts` shares route drafts between the 2D map and 3D site view.
  `useBackendHealth.ts` reports API connectivity.
- Strictly adheres to the 3-color palette (`#212121`, `#EBEBEB`, `#8F5A53`) and
  design system specified in [specs/design-system.md](design-system.md).
- Contains no scientific computation. Heavy processing belongs in the backend.

### Backend (`backend/`)

- Exposes a JSON HTTP API with FastAPI.
- `GET /health` is the liveness endpoint for Render and the frontend.
- `GET /scenarios/{scenario_id}` serves a prepared field scenario (`hawksbill-gap`)
  from committed JSON built by `prep/scenario_bundle.py`; see [scenario-api.md](scenario-api.md).
- `GET /scenarios/{scenario_id}/environment` serves optional archival context (MEDA
  weather at Jezero, Curiosity RAD at Gale) built by `prep/environment_context.py`;
  see [environment-api.md](environment-api.md).
- `GET /api/scenario/{scenario_id}/slope` serves the precomputed surface slope overlay
  (Horn 3x3 kernel, 1.0 m grid resolution) built by `prep/slope.py`; see [scenario-api.md](scenario-api.md).
- `GET /sites`, `/sites/{site_id}/terrain`, `/sites/{site_id}/texture.jpg` and
  `/sites/{site_id}/routes` serve committed HiRISE terrain packages (Columbia Hills in
  Gusev, Hawksbill Gap in Jezero) and plan shortest vs lower-risk routes on them;
  `GET /terrain/nomenclature` serves IAU names for the globe. See [sites-api.md](sites-api.md).
- Enforces CORS using the comma-separated `CORS_ORIGINS` variable
  (default `http://localhost:5173` for local development).
- Parses environment configuration in `app/config.py`; wildcard CORS origins
  fail startup, and an empty list disables cross-origin access.
- Serves prepared terrain and computes routes. Offline GIS preparation lives in
  `backend/prep/`; see the [dataset runbook](dataset-runbook.md).

## Hosting

| Component | Platform         | Config                     | Deploy trigger    |
| --------- | ---------------- | -------------------------- | ----------------- |
| Frontend  | Cloudflare Pages | Dashboard settings         | Push to `main`    |
| Backend   | Render Free      | `render.yaml` (Blueprint)  | Push to `main`    |
| CI        | GitHub Actions   | `.github/workflows/ci.yml` | Every push and PR |

Free-tier constraints to keep in mind:

- **Render Free** sleeps after ~15 minutes idle (cold start up to ~1 minute), has limited
  RAM/CPU, and has an **ephemeral filesystem**: files written at runtime are lost on
  restart or redeploy.
- **Cloudflare Pages** serves static files only. The frontend has no server-side code.

## Data and hosting constraints

- Use real, cited Mars datasets and record their provenance in [sources.md](sources.md).
- Keep full-resolution rasters out of Git. Prepare compact terrain packages offline for the API.
- If computation gets too heavy for Render Free, or the team needs persistent storage,
  discuss it with the team first (see AGENTS.md). Don't add infrastructure unilaterally.
