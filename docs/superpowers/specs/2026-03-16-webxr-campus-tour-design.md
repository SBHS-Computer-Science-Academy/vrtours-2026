# SBHS WebXR Campus Tour — Phase 1 Design Spec

## Overview

A WebXR 360° campus tour app for Santa Barbara High School, built by CS Academy students. Users pick a tour, then navigate between 360° photo locations via in-scene hotspots and a location picker menu. Tours are defined in human-editable YAML files.

**Phase 1 scope:** 360° still images with scene transitions and a location-picker menu. Video, AR, maps, and multiplayer are future phases.

**Stack:** Babylon.js WebXR client, Vite build tooling, static hosting (Cloudflare Pages / Vercel / Netlify), Cloudflare R2 for media storage.

## Architecture

The system splits into two deployment targets:

**Static app site** (Cloudflare Pages / Vercel / Netlify) — Contains the Babylon.js client and bundled tour definitions (YAML converted to JSON at build time). Auto-deploys on git push. Lightweight, fast deploys.

**Media bucket** (Cloudflare R2) — Stores 360° photos at multiple resolutions plus thumbnails. Synced via a CLI script. Zero egress fees.

At runtime, the client loads bundled tour definitions, then fetches media from the R2 bucket. The bucket URL is the only configuration, set via environment variable at build time (`VITE_MEDIA_BASE_URL`). This URL serves as the base for both `360-photos/` and `thumbnails/` subdirectories (e.g., `https://media.sbhstours.org/360-photos/...` and `https://media.sbhstours.org/thumbnails/...`).

### Team Boundaries

Three teams work in parallel, connected by a shared YAML schema and asset naming convention:

- **App Team** — Owns `app/`, co-owns `schema/`. Builds the Babylon.js client, defines the YAML schema (with Tour Design), and manages the static site deployment.
- **Tour Design Team** — Owns `tours/`, co-owns `schema/`. Defines UX requirements, authors tour YAML files, and performs QA testing.
- **Media Team** — Owns `media/` and the R2 bucket. Captures 360° photos (Insta360), runs the media build/sync pipeline.

Schema changes go through a lightweight PR review process involving all three teams. Teams sync weekly but otherwise work independently.

### Repository Structure

```
vrtours-2026/
  app/
    src/
      main.js              # Entry point, initializes Babylon.js
      scene-manager.js     # PhotoDome, transitions
      tour-loader.js       # YAML parsing, location graph
      hotspot-system.js    # 3D hotspot placement and interaction
      overlay-system.js    # Text overlay placement
      location-picker.js   # 2D menu UI
      platform-adapter.js  # Input detection and handling
      config.js            # Media bucket URL, settings
    public/
      index.html           # Shell HTML
    tests/
      tour-loader.test.js
      scene-manager.test.js
      hotspot-system.test.js
      ...
    vite.config.js
    package.json
  tours/
    example-campus-tour.yaml
    ...
  schema/
    tour-schema.json       # JSON Schema for YAML validation
  media/
    originals/             # Raw from camera (gitignored)
    360-photos/            # Generated variants (gitignored)
    thumbnails/            # Generated (gitignored)
    manifest.json          # Generated asset inventory (gitignored)
    scripts/
      build.js             # Resize + optimize images
      sync.js              # Upload to R2
  docs/
    team-roles.md
    brainstorm-prompt.md
```

## YAML Tour Schema

Tour definitions are human-editable YAML files in `tours/`. A JSON Schema in `schema/tour-schema.json` formally validates their structure.

```yaml
# Tour metadata
name: "SBHS Campus Tour"
description: "A walking tour of Santa Barbara High School"
thumbnail: "campus-tour-thumb.jpg"       # relative to thumbnails/
startLocation: "main-entrance"            # which location loads first

# Locations
locations:
  - id: "main-entrance"                  # unique, kebab-case
    name: "Main Entrance"
    description: "Welcome to SBHS"
    media: "main-entrance.jpg"            # relative to 360-photos/
    thumbnail: "main-entrance-thumb.jpg"  # optional, for location picker

    # Hotspots — clickable markers in the 360 scene
    hotspots:
      - target: "quad"                    # connection to another location ID
        yaw: 45.2                         # horizontal angle, 0-360 degrees
        pitch: -5.0                       # vertical angle, -90 to +90 degrees
        label: "To the Quad"             # tooltip text

    # Text overlays — informational panels in the scene
    overlays:
      - text: "Built in 1875"
        yaw: 120.0
        pitch: 10.0

    # Connections — all navigable locations (used by list menu)
    connections:
      - "quad"
      - "library"
```

### Schema Design Decisions

- **Media paths are relative.** The app prepends the configured bucket URL at runtime. The same YAML works in dev (local files) and production (R2).
- **Hotspots are separate from connections.** Connections define the navigation graph (what's reachable via the list menu). Hotspots define spatial markers in the scene. A location can be connected without having a hotspot — the list menu is the fallback.
- **Yaw/pitch coordinates** position elements in the photosphere. The Platform Adapter includes a dev mode (enabled via a URL parameter like `?dev=true`) that displays yaw/pitch coordinates on click/tap, so the Tour Design team can find the right values for hotspot and overlay placement.
- **Overlays are text-only in Phase 1.** Image/video overlays are a future enhancement.
- **`startLocation`** is set per tour so each tour controls its own entry point.

## Babylon.js Client

A single-page app with six focused modules. One codebase serves VR headsets, desktop browsers, and mobile browsers.

### Scene Manager

Loads equirectangular photos onto a Babylon.js `PhotoDome`. Handles transitions between locations with a crossfade effect: fade to black, swap the texture, fade in. Selects the appropriate resolution based on device:

- **VR headsets (Quest):** 8K (8192x4096)
- **Desktop:** 4K (4096x2048)
- **Mobile:** 2K (2048x1024)

### Tour Loader

Parses bundled tour JSON (converted from YAML at build time) at startup. Builds the location graph and exposes tour data to other modules. Resolves media paths by prepending the configured bucket URL and appending the resolution suffix. For example, `media: "main-entrance.jpg"` resolves to `{MEDIA_BASE_URL}/360-photos/main-entrance-4k.jpg` on desktop. The Scene Manager requests media through the Tour Loader, passing the desired resolution tier; the Tour Loader handles all path assembly.

### Hotspot System

Places 3D billboard sprites in the scene at yaw/pitch positions defined in the YAML. Each hotspot shows an arrow icon and label text, always faces the camera. Click (desktop), tap (mobile), or controller ray + trigger (VR) triggers a scene transition to the target location.

### Overlay System

Places semi-transparent text cards in the scene at yaw/pitch positions. Non-interactive, informational only.

### Location Picker Menu

A 2D UI panel (Babylon.js GUI) listing all locations in the current tour with names and thumbnails.

- **VR:** Floating panel activated by a controller button.
- **Desktop/Mobile:** Overlay panel toggled by a button in the corner.

Always accessible as a fallback to hotspot navigation. Shows all locations in the tour (not just the current location's connections), so users can jump to any point in the tour.

### Platform Adapter

Detects the runtime environment and configures input handling:

- **VR (WebXR):** Controller ray for pointing, trigger to select.
- **Desktop:** Mouse drag to look around, click to interact with hotspots/menu.
- **Mobile:** Touch drag to look around, tap to interact. Optional gyroscope/accelerometer for device-orientation-based looking.

## Media Pipeline

The Media team captures 360° photos with Insta360 hardware. A Node.js build script handles optimization and a sync script handles upload to R2.

### Workflow

1. Export equirectangular JPEGs from Insta360 Studio.
2. Place originals in `media/originals/` (gitignored).
3. Run `npm run media:build` to generate optimized variants.
4. Run `npm run media:sync` to upload to R2.

### Asset Naming Convention

```
originals/
  main-entrance.jpg           # Raw from camera (8K+)

360-photos/                    # Generated by build script
  main-entrance-8k.jpg        # 8192x4096 — VR
  main-entrance-4k.jpg        # 4096x2048 — desktop
  main-entrance-2k.jpg        # 2048x1024 — mobile

thumbnails/                    # Generated by build script
  main-entrance-thumb.jpg     # 400x300 — location picker
  campus-tour-thumb.jpg       # 400x300 — tour card
```

File names must be kebab-case and match the `media` field in the YAML (without the resolution suffix — the client appends the appropriate suffix based on device).

### Build Script (`media/scripts/build.js`)

- Reads all files from `media/originals/`.
- Uses [sharp](https://sharp.pixelplumbing.com/) to resize to three resolution variants plus a thumbnail.
- Validates: correct aspect ratio (2:1 for equirectangular), minimum resolution, JPEG format.
- Outputs to `media/360-photos/` and `media/thumbnails/`.
- Generates `media/manifest.json` — an inventory of all processed assets with dimensions and file sizes.
- Exits with clear error messages on validation failure.

### Sync Script (`media/scripts/sync.js`)

- Reads `media/manifest.json`.
- Uploads new/changed files to R2 using the S3-compatible API (`@aws-sdk/client-s3`).
- Sets long cache headers (media files are immutable — new photos get new filenames).
- Reports what was uploaded and what was skipped.

### What Lives Where

- **In git:** `media/scripts/`, `media/README.md`.
- **Gitignored:** `media/originals/`, `media/360-photos/`, `media/thumbnails/`, `media/manifest.json`.
- **Backed up externally:** Originals (school Google Drive, external hard drive — Media team's responsibility).

## Testing Strategy

Three layers targeting the integration points that matter most.

### Layer 1: Schema Validation

The highest-leverage test. Catches misalignment between all three teams.

- A JSON Schema file (`schema/tour-schema.json`) formally defines the YAML structure.
- Test script validates every `.yaml` file in `tours/` against the schema.
- Cross-references media files: checks that all `media` and `thumbnail` references exist in the manifest (or locally in dev).
- Run: `npm run test:schema`.

### Layer 2: Client Unit Tests

Tests for the app's core logic, using [Vitest](https://vitest.dev/).

- **Tour Loader:** Parses YAML correctly, builds location graph, resolves media paths, handles missing/malformed data gracefully.
- **Scene Manager:** Transitions between locations, selects correct resolution for device type.
- **Hotspot System:** Converts yaw/pitch to 3D positions correctly.
- Mocks Babylon.js engine where needed (logic tests don't require a WebGL context).
- Run: `npm run test:client`.

### Layer 3: Media Validation

Runs as part of the media build step.

- Validates aspect ratio (2:1), minimum resolution, JPEG format, and naming convention.
- Exits with descriptive error messages on failure.
- Manifest generation serves as an integration check — schema validation (Layer 1) catches YAML references to missing media.

### Running Tests

- `npm test` — Runs all three layers.
- `npm run test:schema` — Schema validation only (fast — Tour Design team runs this often).
- `npm run test:client` — Client unit tests only.
- `npm run media:build` — Media validation runs as a side effect.

### CI

No dedicated CI pipeline beyond the hosting platform's build step. Cloudflare Pages / Vercel / Netlify run `npm run build` on push, which includes schema validation. For PR checks, a single GitHub Actions workflow running `npm test` is sufficient.

## Build & Deploy

### Tooling

[Vite](https://vite.dev/) as the bundler. A build plugin converts YAML files from `tours/` to JSON and includes them in the output bundle (so the client doesn't need a YAML parser at runtime).

### Dev Workflow

```bash
npm run dev          # Vite dev server with hot reload
                     # Uses local media or placeholder images
```

In dev mode, `VITE_MEDIA_BASE_URL` defaults to a local path (`/media/360-photos/`) so the app works with locally generated media files or placeholder images.

### Production Build

```bash
npm run build        # Vite production build -> dist/
                     # YAML validated and converted to JSON
                     # Media URL injected from VITE_MEDIA_BASE_URL env var
```

### Deploy Flow

- **App:** Push to `main` triggers auto-build and deploy on the hosting platform. Schema validation runs as part of the build — invalid YAML fails the deploy.
- **Media:** Media team runs `npm run media:build && npm run media:sync` manually. Automation via GitHub Actions is a future enhancement.

### Environment Configuration

| Variable | Dev Default | Production |
|---|---|---|
| `VITE_MEDIA_BASE_URL` | `/media/360-photos/` | R2 bucket URL (e.g., `https://media.sbhstours.org`) |

## Future Phases (Out of Scope)

The following are explicitly not part of Phase 1 but inform the design's extensibility:

- **Phase 2:** 360° video support (swap `PhotoDome` for `VideoDome`).
- **Phase 3:** Ambient/narration audio per location.
- **Phase 4:** Interactive map overlay showing tour progress.
- **Phase 5:** AR mode, multiplayer, analytics.

The YAML schema, module architecture, and media pipeline are designed to accommodate these additions without restructuring.
