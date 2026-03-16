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

See `docs/brainstorm-prompt.md` for the project spec and `docs/team-roles.md` for team responsibilities.

## How the Pieces Connect

All three teams build against a shared contract:
1. **Schema** (`schema/`) defines the YAML format for tours
2. **Tour Design** authors `.yaml` files in `tours/` referencing media assets
3. **Media** produces assets in `media/` following agreed naming conventions
4. **App** reads the YAML and serves the experience
