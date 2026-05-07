# Multiple Tours & Homepage Design Spec

## Overview

Add a tour selection homepage to the SBHS VR Tours app. Instead of auto-loading a single tour on startup, users land on a homepage that presents 5 distinct tours to choose from. The homepage is a DOM overlay built into the existing single-page app — no separate HTML page, no routing library.

**School colors:** Dark green background (`#0d1f0e`), gold accents (`#c9a84c`).

## Tours

Five tours, each defined in its own YAML file in `tours/`. All tours start at `main-entrance`. Locations do not overlap between tours (except the shared `main-entrance` start point, which is duplicated in each file).

| File | Tour Name |
|---|---|
| `campus-tour.yaml` | Full Campus Tour |
| `academics-tour.yaml` | Academics Tour |
| `athletics-tour.yaml` | Athletics Tour |
| `arts-tour.yaml` | Arts Tour |
| `career-tech-tour.yaml` | Career Tech Pathways |

The existing `homepage-tour.yaml` is retired — its locations are redistributed into the appropriate themed tour files. `example-campus-tour.yaml_` (currently broken with trailing underscore) is also retired.

Each YAML uses the existing schema with `name`, `description`, `thumbnail`, `startLocation`, and `locations` fields. No schema changes required.

## App Flow

**Current:** Babylon.js inits immediately → loads `tourIndex[0]` → navigates to `startLocation`.

**New:**
1. Fetch all tour JSONs from `/tours/` → extract `name`, `description`, `thumbnail` for each
2. Show homepage overlay — Babylon.js does **not** init yet
3. User selects a tour → homepage fades out (300ms)
4. Babylon.js engine + scene init with selected tour data
5. Navigate to `startLocation` — tour begins

Returning to homepage from inside a tour:
1. User clicks "Change Tour" button
2. Screen fades to black (300ms)
3. Current PhotoDome/scene content disposed
4. Homepage overlay shown again
5. User picks a new tour → step 4 above repeats

## Architecture

### `index.html`

Add `<div id="homepage">` as a full-screen overlay above the canvas. Styled dark green, `z-index` above the canvas. Hidden (opacity 0, pointer-events none) when a tour is active.

```html
<canvas id="app"></canvas>
<div id="homepage"></div>
```

### New: `homepage.js`

Single-responsibility module that owns the homepage DOM. Interface:

```js
// Build and show the homepage. tours = array of { id, name, description, thumbnail }.
// onSelect(tourId) called when user picks a tour.
export function showHomepage(tours, onSelect) { ... }

// Hide the homepage (fade out).
export function hideHomepage() { ... }
```

Internally builds the card/list UI, applies responsive layout via CSS media query, and wires up click handlers. No Babylon.js dependency.

**Responsive layout (CSS media query at 768px breakpoint):**

- **Desktop / headset (≥768px) — Layout A:** School name hero banner → 2×2 grid of themed tour cards (Academics, Athletics, Arts, Career Tech) → Full Campus Tour as a gold CTA bar spanning full width below the grid.
- **Mobile (<768px) — Layout B:** Compact school name header → Full Campus Tour as a featured gold card at top → themed tours as a vertical list with emoji icon, name, subtitle, and gold chevron.

### `main.js` changes

Split the existing `main()` into two phases:

**`initHomepage()`** (runs on page load):
- Fetches all tour JSON files
- Calls `showHomepage(tours, onTourSelect)`

**`startTour(tourData)`** (runs when user picks a tour — contains all current Babylon.js init logic):
- Calls `hideHomepage()`
- Creates the Babylon.js engine once (first call only — reused on subsequent calls)
- Creates a new scene + camera for this tour
- Loads tour, navigates to `startLocation`
- Adds "Change Tour" button to UI

**`returnToHomepage()`**:
- Fades screen to black (via existing `animateFade`)
- Disposes the current scene (PhotoDome/VideoDome, hotspots, overlays, camera — but NOT the engine)
- Calls `showHomepage(tours, onTourSelect)` again

### UI Controls (in-tour)

Two buttons in the top bar when a tour is active:

| Button | Position | Action |
|---|---|---|
| ☰ (hamburger) | Top-right | Toggle location picker (existing) |
| ← Change Tour | Top-left | Return to homepage |

Both use the same dark semi-transparent pill style (`rgba(0,0,0,0.5)` background, white text, 50×50px).

## Tour Data Files

### Content responsibility

The Tour Design team authors the 5 YAML files. Location IDs and media filenames follow existing naming conventions (kebab-case). Each tour:
- Starts with `startLocation: main-entrance`
- Includes the `main-entrance` location entry with hotspots pointing toward that tour's first locations
- Contains only locations relevant to that tour theme

### Build

No changes to the Vite build pipeline. The existing plugin already converts all `.yaml` files in `tours/` to JSON and generates `index.json`. Adding new YAML files is sufficient — they are automatically picked up.

## Visual Design

| Element | Value |
|---|---|
| Page background | `#0d1f0e` (dark green) |
| Card background | `#122614` |
| Card border | `#1e3a20` |
| Nav/header background | `#091509` |
| Gold accent (CTA, chevrons, labels) | `#c9a84c` |
| Gold CTA gradient | `#c9a84c` → `#a8872e` |
| Body text | `#ffffff` |
| Subtitle / secondary text | `#6a8a6c` |
| Hero gradient | `#0d2a0f` → `#091a0a` |

The "D" logo placeholder in the nav bar is a gold circle — to be replaced with the actual Dons logo once available.

## Testing

Extend existing test layers:

- **Schema validation (`npm run test:schema`)** — already validates all `.yaml` files in `tours/`; adding 5 new files is automatically covered.
- **Client unit tests** — add tests for `homepage.js`: renders correct number of tour cards, `onSelect` fires with correct tour ID, `hideHomepage` removes the overlay.
- **Manual QA** — verify responsive breakpoint at 768px, verify "Change Tour" returns to homepage cleanly, verify all 5 tours load and navigate correctly.

## Out of Scope

- Tour thumbnails for the homepage cards — placeholder images are acceptable for initial implementation; real thumbnails added by Media team later.
- Animations beyond the existing 300ms fade (no slide transitions, no skeleton loaders).
- Persisting the last-visited tour across page reloads.
- Any changes to in-tour navigation, hotspot behavior, or overlay system.
