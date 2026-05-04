# Open Issues

## Bug: Landing page media fails to load

**Priority:** High  
**Labels:** `bug` `media`

The app cannot display any 360 photo on the landing page. When the app starts it navigates to the `main-entrance` location and tries to fetch `/media/360-photos/main-entrance-4k.jpg`, but that file does not exist. The actual files on disk use a `-placeholder` suffix (e.g. `main-entrance-placeholder-4k.jpg`). The same mismatch affects every other location that has a placeholder file (`library`, `gym`).

**Fix:** Update the `media:` field in `homepage-tour.yaml` to include `-placeholder` so the resolved filename matches what is on disk.

---

## Bug: Most tour locations have no media files

**Priority:** High  
**Labels:** `bug` `media` `content`

`homepage-tour.yaml` defines 21 locations but only 3 of them (`main-entrance`, `library`, `gym`) have any 360 photo on disk. Locations such as `senior-lawn`, `performing-arts`, `stadium`, `pool`, and others will fail to load when a user navigates to them.

**Fix:** Either shoot and add the missing 360 photos, or remove the locations from the YAML until their media is ready.

---

## Bug: `example-campus-tour.yaml` accidentally renamed

**Priority:** Medium  
**Labels:** `bug` `tours`

`tours/example-campus-tour.yaml` was deleted and replaced with `tours/example-campus-tour.yaml_` (trailing underscore). The dev server only loads files ending in `.yaml`, so this tour is invisible in dev mode. The old built copy at `app/dist/tours/example-campus-tour.json` still exists but is now out of sync with the source.

**Fix:** Rename `example-campus-tour.yaml_` back to `example-campus-tour.yaml` and commit it.

---

## Task: Add real 360 photos for existing placeholder locations

**Priority:** Medium  
**Labels:** `media` `content`

The following locations have placeholder images that should be replaced with real 360 photos once they are captured:

- Main Entrance (`main-entrance-placeholder-4k.jpg`)
- Library (`library-placeholder-4k.jpg`)
- Gym (`gym-placeholder-4k.jpg`)
- Quad (`quad-placeholder-4k.jpg`) — a real `quad-4k.jpg` also exists but is not referenced by any active tour
- CS Driveway (`csDriveway-placeholder-4k.jpg`)
- CS Back Parking (`csBackParking-placeholder-4k.jpg`)
- Pep Rally (`pepRally-placeholder-4k.jpg`)

---

## Task: Install GitHub CLI (`gh`) for issue management

**Priority:** Low  
**Labels:** `setup`

The `gh` CLI is not installed on this machine, making it impossible to manage GitHub issues from the terminal. Install via Homebrew:

```
brew install gh
gh auth login
```

---

## Task: Add missing thumbnails for all tour locations

**Priority:** Medium  
**Labels:** `media` `content`

The location picker UI displays a thumbnail for each stop. Most thumbnails referenced in `homepage-tour.yaml` are either missing entirely or named incorrectly. The `resolveThumbnailUrl` in `tour-loader.js` builds paths like `/media/thumbnails/<filename>`.

| Location | Expected filename | Status |
|---|---|---|
| Main Entrance | `main-entrance-placeholder-thumb.jpg` | exists |
| Senior Lawn | `senior-lawn-thumb.jpg` | missing |
| Library | `library-thumb.jpg` | missing — file on disk is `library-placeholder-thumb.jpg` |
| Translation Center | `translation-thumb.jpg` | missing |
| Science Building | `science-thumb.jpg` | missing |
| Math Building | `math-thumb.jpg` | missing |
| English Building | `english-thumb.jpg` | missing |
| Woodshop / MAD | `woodshop-thumb.jpg` | missing |
| Sports Medicine | `sports-med-thumb.jpg` | missing |
| Garden | `garden-thumb.jpg` | missing |
| Culinary Arts | `culinary-thumb.jpg` | missing |
| Music | `music-thumb.jpg` | missing |
| Student Events | `student-events-thumb.jpg` | missing |
| Performing Arts | `performing-arts-thumb.jpg` | missing |
| Visual Arts | `visual-arts-thumb.jpg` | missing |
| Gym | `gym-thumb.jpg` | missing — file on disk is `gym-placeholder-thumb.jpg` |
| Pool | `pool-thumb.jpg` | missing |
| Baseball Field | `baseball-thumb.jpg` | missing |
| Stadium | `stadium-thumb.jpg` | missing |
| Tennis Courts | `tennis-thumb.jpg` | missing |
| Softball Field | `softball-thumb.jpg` | missing |

**Fix:** For each location, either shoot a thumbnail and add it to `media/thumbnails/` with the expected filename, or update `homepage-tour.yaml` to reference the filename that actually exists on disk.

---

## Feature: Back button and improved navigation

**Priority:** Medium  
**Labels:** `enhancement` `ux`

The app currently offers two ways to navigate: clicking 3D hotspots in the scene and opening the hamburger menu (top-right) to jump to any location. There is no way to go back to the previous location without knowing where you came from.

**Improvements to consider:**

- **Back button** — a fixed on-screen button that returns to the previously visited location. Requires tracking navigation history (a simple stack in `main.js` would work — push on each `navigateTo` call, pop on back).
- **Breadcrumb / current location label** — a small label showing the name of the current location so users always know where they are.
- **Hotspot labels always visible** — hotspot meshes currently have a `label` in metadata but no visible text is rendered. Showing the destination name above each hotspot would reduce confusion.

**Relevant files:**
- [app/src/main.js](../app/src/main.js) — `navigateTo` function is where history tracking would live
- [app/src/location-picker.js](../app/src/location-picker.js) — where the on-screen UI controls are built
- [app/src/hotspot-system.js](../app/src/hotspot-system.js) — `placeHotspots` renders the 3D hotspot meshes
