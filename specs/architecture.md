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
                             │ fetch(VITE_API_URL + "/health"), JSON over HTTPS
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
- `App.tsx` renders the page; `useBackendHealth.ts` owns connection state and
  request cleanup; `api.ts` makes and validates the health request.
- Strictly adheres to the 3-color palette (`#212121`, `#EBEBEB`, `#8F5A53`) and
  design system specified in [specs/design-system.md](design-system.md).
- Contains no scientific computation. Heavy processing belongs in the backend.

### Backend (`backend/`)

- Exposes a JSON HTTP API with FastAPI.
- `GET /health` is the liveness endpoint for Render and the frontend.
- `GET /scenarios/{scenario_id}` serves a prepared field scenario (`hawksbill-gap`)
  from committed JSON built by `prep/scenario_bundle.py`; see [scenario-api.md](scenario-api.md).
- Enforces CORS using the comma-separated `CORS_ORIGINS` variable
  (default `http://localhost:5173` for local development).
- Parses environment configuration in `app/config.py`; wildcard CORS origins
  fail startup, and an empty list disables cross-origin access.
- Will own all geospatial data access and computation (see below).

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

## Future extension points

These are not implemented. They are listed so new work fits into the existing structure.

### GIS data (backend)

- Add dataset access in a dedicated backend module (e.g. `backend/app/terrain.py`) and
  expose it through new FastAPI routes.
- Use only real, cited NASA/USGS datasets (e.g. HiRISE/MOLA/CTX products from the
  NASA Planetary Data System or USGS Astrogeology). Record each source in `specs/`.
- Large raster files must not be committed to Git, and they don't fit well on Render
  Free's ephemeral disk and memory limits. Options to evaluate with the team: small
  pre-processed tiles committed or generated at build time, or reading from public
  cloud-hosted datasets on demand.
- GIS libraries (e.g. rasterio, GDAL, shapely) are added only when this work starts.

### Map display (frontend)

- Add a map view component in `frontend/src/` that renders tiles or GeoJSON from the
  backend. A map library will be chosen at that point.

### Route planning (backend)

- Route computation (e.g. slope/hazard-aware path finding over terrain data) runs in the
  backend and is exposed as an API endpoint such as `POST /routes` taking start and end
  coordinates and returning a GeoJSON path.
- Define the request/response contract in `specs/` before implementing it.
- Algorithms must be covered by pytest tests.

### When to revisit this architecture

- If computation gets too heavy for Render Free, or the team needs persistent storage,
  discuss it with the team first (see AGENTS.md). Don't add infrastructure unilaterally.
