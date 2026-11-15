# Development checks

CI runs backend checks, frontend checks, and secret scanning on pushes and pull requests.
Dependabot opens weekly update PRs for npm, uv, and GitHub Actions.

## Local commands

From `frontend/`:

```sh
npm run check       # Format check, lint, tests, build
npm run format      # Format frontend code, Markdown, JSON, and YAML across the repo
```

From `backend/`:

```sh
uv run ruff check .
uv run ruff format --check .
uv run pytest
uv run ruff format .         # Apply formatting
uv run ruff check --fix .    # Apply safe lint fixes
```

## Secrets

- Keep secrets in backend environment variables or GitHub Actions secrets.
  Everything exposed through `VITE_` variables is public browser code.
- `.gitignore` excludes environment files and private-key files; `.env.example`
  must contain examples only. Ignore rules do not protect already tracked files.
- CI runs Gitleaks with redacted output and no PR comments or report uploads.
  The action is free for personal repositories; organization ownership requires a license.
- CI scans after a push. Enable GitHub secret scanning and push protection to
  detect supported secrets and block them before a push is accepted.
- If a secret leaks, revoke or rotate it immediately; deleting the file is insufficient.

Recommended repository settings: require the three CI checks and a PR review
before merging into `main`; enable Dependabot alerts and security updates.
