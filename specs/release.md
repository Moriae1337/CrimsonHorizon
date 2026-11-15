# Release checklist

Steps for deploying the Hawksbill Gap demo: backend on Render (#99), frontend on
Cloudflare Pages (#100). Deploy the backend first; the frontend build needs its URL.

Values in `<ANGLE_BRACKETS>` are placeholders. The repository only has example URLs
(`.env.example`, `render.yaml`), so copy the real ones from the Render and Cloudflare
dashboards.

## 1. Backend on Render

`render.yaml` defines the `crimson-horizon-backend` web service:

- `rootDir: backend`, build `uv sync --frozen --no-dev`, start
  `uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port $PORT`,
  health check `/health`.
- The build installs only `fastapi` and `uvicorn`. The `dev` and `prep` groups
  (rasterio) are not installed, and `app/` does not import `prep/`.
- The scenario is served from `backend/data/hawksbill_gap/scenario.json`, which is
  committed inside `rootDir`. No terrain raster is downloaded at build or run time.
  `tests/test_release.py` checks all of this.

Set in Render → service → Environment:

| Key            | Value                                                     |
| -------------- | --------------------------------------------------------- |
| `CORS_ORIGINS` | `https://<PAGES_PROJECT>.pages.dev,http://localhost:5173` |

- Comma-separated exact origins: scheme + host, no path. A trailing slash is removed.
- `*` makes startup fail, and patterns such as `https://*.pages.dev` are not supported.
- Cloudflare preview URLs (`https://<HASH>.<PAGES_PROJECT>.pages.dev`,
  `https://<BRANCH>.<PAGES_PROJECT>.pages.dev`) are different origins. Add each
  preview origin you want to test, or test previews against a local backend.
- A changed `CORS_ORIGINS` takes effect only after a restart or redeploy.

## 2. Frontend on Cloudflare Pages

Expected project settings: root directory `frontend`, build command `npm run build`,
output directory `dist`, Node.js version from `frontend/.nvmrc` (24).

Set in Cloudflare → Pages project → Settings → Variables and Secrets, for
Production (and Preview if previews should use the same backend):

| Key            | Value                                   |
| -------------- | --------------------------------------- |
| `VITE_API_URL` | `https://<RENDER_SERVICE>.onrender.com` |

- No trailing slash and no path. The value is built into the JavaScript bundle, so
  redeploy the frontend after you change it.
- It is public. Never put secrets in `VITE_` variables.

## 3. Smoke tests

```sh
API=https://<RENDER_SERVICE>.onrender.com
WEB=https://<PAGES_PROJECT>.pages.dev

# The first request after idle can take up to about a minute (see below).
curl -sS --max-time 90 "$API/health"
# {"status":"ok"}

# Expect 200, content-type application/json, and access-control-allow-origin: $WEB
curl -sS -o /dev/null -D - -H "Origin: $WEB" "$API/scenarios/hawksbill-gap"

# Check schema_version (MAJOR 1)
curl -sS "$API/scenarios/hawksbill-gap" | grep -o '"schema_version":"[^"]*"'

# Preflight: expect 200 and access-control-allow-origin: $WEB
curl -sS -o /dev/null -D - -X OPTIONS -H "Origin: $WEB" \
  -H "Access-Control-Request-Method: GET" "$API/scenarios/hawksbill-gap"

# An unlisted origin: expect no access-control-allow-origin header
curl -sS -o /dev/null -D - -H "Origin: https://example.com" "$API/health"
```

Then open `$WEB` in a fresh private window. Check that the backend status is
connected, the base map loads, and the Hawksbill Gap cards and both routes appear.
The browser console must show no CORS errors.

## 4. Render Free cold start

- The service sleeps after about 15 minutes idle. The first request can take up to
  about a minute. The frontend waits up to 60 s for the scenario and offers a retry.
- Before a demo or a judging window, wake the service with `curl "$API/health"`.
- The filesystem is ephemeral. Everything served is committed, so a restart does not
  lose data.

## Error responses

`GET /scenarios/{id}` returns `404` for an unknown id and `503` when the bundled file
cannot be loaded (see [scenario-api.md](scenario-api.md)). A `503` after a deploy
means the build is broken. Check the Render logs for `Scenario ... is unavailable`.
