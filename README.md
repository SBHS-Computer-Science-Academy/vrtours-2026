# SBHS VR Tours

WebXR 360° campus tour app for Santa Barbara High School, built by CS Academy students.

## Project Structure

```
app/          → Server + Babylon.js WebXR client (App Team)
tours/        → Tour definition YAML files (Tour Design Team)
media/        → 360° photos, videos, audio, thumbnails (Media Team)
schema/       → Shared YAML schema & asset naming conventions (all teams)
docs/         → Project docs, specs, and planning
```

## Quick Start

### Install dependencies

```bash
# From the project root, install each sub-package:
cd app && npm install
cd ../schema && npm install
cd ../media/scripts && npm install
cd ../..
```

### Run the dev server

```bash
npm run dev
```

This starts a Vite dev server from `app/`, serving the Babylon.js WebXR 360° tour viewer. Tour YAML files are validated on startup and media is served from `media/`.

### Other commands (all from root)

| Command | Description |
|---|---|
| `npm run build` | Validates schema then builds the app for production |
| `npm test` | Runs all tests (schema, client, media) |
| `npm run test:client` | Runs only the app/client Vitest tests |
| `npm run test:schema` | Validates tour YAML against the JSON schema |
| `npm run test:media` | Runs media script tests |
| `npm run media:build` | Processes media assets (thumbnails, etc.) |

### Learn more

See `docs/brainstorm-prompt.md` for the project spec and `docs/team-roles.md` for team responsibilities.

## How the Pieces Connect

All three teams build against a shared contract:
1. **Schema** (`schema/`) defines the YAML format for tours
2. **Tour Design** authors `.yaml` files in `tours/` referencing media assets
3. **Media** produces assets in `media/` following agreed naming conventions
4. **App** reads the YAML and serves the experience
