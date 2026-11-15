# CrimsonHorizon

Static React frontend + stateless FastAPI backend in one repository.

- `frontend/`: React, TypeScript, Vite, Tailwind; npm. UI and HTTP calls only.
  `App.tsx` renders the page, `useBackendHealth.ts` manages connection state,
  and `api.ts` handles health requests. All UI components, colors, and styling
  must strictly follow the 3-color palette design system defined in
  [specs/design-system.md](specs/design-system.md).
- `backend/`: FastAPI, Python 3.12+; uv. `app/main.py` defines endpoints,
  `app/config.py` reads configuration, `tests/` contains pytest tests.
  Future GIS processing and route computation belong here.
- Configuration: `VITE_API_URL` connects the frontend to the API;
  `CORS_ORIGINS` controls allowed frontend origins. See `.env.example`.
- Hosting: Cloudflare Pages + Render Free (`render.yaml`). No database or queue.
- Keep modules simple. New infrastructure requires team approval.
  Use real, cited Mars data only.

Architecture details: [specs/architecture.md](specs/architecture.md).
Design system & palette: [specs/design-system.md](specs/design-system.md).
Project overview: [README.md](README.md).
Development checks: [specs/development.md](specs/development.md).
