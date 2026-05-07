# Multiple Tours & Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single auto-loading tour with a homepage overlay that lets users choose from 5 themed tours, implemented as a DOM layer over the existing Babylon.js canvas.

**Architecture:** A new `homepage.js` module owns the full-screen `<div id="homepage">` overlay; `main.js` is split into `initHomepage()` (runs on load, shows the homepage) and `startTour(tourId)` (runs on selection, inits Babylon.js). A `returnToHomepage()` function disposes the current scene and brings the homepage back. The Babylon.js engine is created once and reused across tour switches.

**Tech Stack:** Vanilla JS DOM, CSS media query (768px breakpoint), Babylon.js 7, Vitest + happy-dom for tests, js-yaml via existing Vite plugin.

---

## File Map

**Create:**
- `tours/campus-tour.yaml` — Full campus tour (21 locations)
- `tours/academics-tour.yaml` — Academics tour (7 locations)
- `tours/athletics-tour.yaml` — Athletics tour (7 locations)
- `tours/arts-tour.yaml` — Arts tour (5 locations)
- `tours/career-tech-tour.yaml` — Career Tech Pathways tour (5 locations)
- `app/src/homepage.js` — Homepage DOM module
- `app/tests/homepage.test.js` — Vitest unit tests for homepage.js

**Modify:**
- `app/index.html` — Add `<div id="homepage">`
- `app/src/main.js` — Split into `initHomepage` / `startTour` / `returnToHomepage`
- `app/package.json` — Add `happy-dom` dev dependency for DOM tests

**Delete:**
- `tours/homepage-tour.yaml`
- `tours/example-campus-tour.yaml_`

---

## Task 1: Create the 5 tour YAML files

**Files:**
- Create: `tours/campus-tour.yaml`
- Create: `tours/academics-tour.yaml`
- Create: `tours/athletics-tour.yaml`
- Create: `tours/arts-tour.yaml`
- Create: `tours/career-tech-tour.yaml`
- Delete: `tours/homepage-tour.yaml`
- Delete: `tours/example-campus-tour.yaml_`

- [ ] **Step 1.1: Create `tours/campus-tour.yaml`**

```yaml
name: Full Campus Tour
description: A complete tour of Santa Barbara High School — all buildings, fields, and facilities.
thumbnail: campus-tour-thumb.jpg
startLocation: main-entrance

locations:
  - id: main-entrance
    name: Main Entrance
    media: main-entrance-placeholder.jpg
    thumbnail: main-entrance-placeholder-thumb.jpg
    description: Welcome to Santa Barbara High School!
    overlays:
      - text: Founded in 1875
        yaw: 180
        pitch: 15
    hotspots:
      - target: senior-lawn
        yaw: 0
        pitch: 0
        label: Toward Senior Lawn
      - target: gym
        yaw: 120
        pitch: -5
        label: Toward Gym & Athletics
    connections:
      - senior-lawn
      - gym

  - id: senior-lawn
    name: Senior Lawn
    media: senior-lawn-placeholder.jpg
    thumbnail: senior-lawn-placeholder-thumb.jpg
    description: A central gathering space for students.
    hotspots:
      - target: performing-arts
        yaw: 0
        pitch: 0
        label: To Performing Arts
      - target: main-entrance
        yaw: 180
        pitch: 0
        label: Back to Entrance
      - target: library
        yaw: 90
        pitch: 0
        label: To Library
    connections:
      - performing-arts
      - main-entrance
      - library

  - id: library
    name: Library
    media: library-placeholder.jpg
    thumbnail: library-placeholder-thumb.jpg
    description: A quiet place for studying and research.
    hotspots:
      - target: translation
        yaw: 20
        pitch: 0
        label: To Translation Center
      - target: senior-lawn
        yaw: 180
        pitch: 0
        label: Back to Lawn
    connections:
      - translation
      - senior-lawn

  - id: translation
    name: Translation Center
    media: translation-placeholder.jpg
    thumbnail: translation-placeholder-thumb.jpg
    description: Support services for multilingual students.
    hotspots:
      - target: science
        yaw: 45
        pitch: 0
        label: To Science
      - target: library
        yaw: 220
        pitch: 0
        label: Back to Library
    connections:
      - science
      - library

  - id: science
    name: Science Building
    media: science-placeholder.jpg
    thumbnail: science-placeholder-thumb.jpg
    description: Science classrooms and labs.
    hotspots:
      - target: math
        yaw: 90
        pitch: 0
        label: To Math
      - target: english
        yaw: 30
        pitch: 0
        label: To English
      - target: translation
        yaw: 220
        pitch: 0
        label: Back to Translation
    connections:
      - math
      - english
      - translation

  - id: math
    name: Math Building
    media: math-placeholder.jpg
    thumbnail: math-placeholder-thumb.jpg
    description: Math classrooms.
    hotspots:
      - target: science
        yaw: 270
        pitch: 0
        label: Back to Science
      - target: gym
        yaw: 200
        pitch: 0
        label: Toward Gym
    connections:
      - science
      - gym

  - id: english
    name: English Building
    media: english-placeholder.jpg
    thumbnail: english-placeholder-thumb.jpg
    description: English classrooms.
    hotspots:
      - target: woodshop
        yaw: 0
        pitch: 0
        label: To Woodshop
      - target: science
        yaw: 200
        pitch: 0
        label: Back to Science
    connections:
      - woodshop
      - science

  - id: woodshop
    name: Woodshop / MAD Academy
    media: woodshop-placeholder.jpg
    thumbnail: woodshop-placeholder-thumb.jpg
    description: Hands-on learning and design programs.
    hotspots:
      - target: sports-med
        yaw: 90
        pitch: 0
        label: To Sports Med
      - target: english
        yaw: 220
        pitch: 0
        label: Back to English
    connections:
      - sports-med
      - english

  - id: sports-med
    name: Sports Medicine
    media: sports-med-placeholder.jpg
    thumbnail: sports-med-placeholder-thumb.jpg
    description: Sports medicine and health programs.
    hotspots:
      - target: garden
        yaw: 160
        pitch: 0
        label: To Garden
      - target: woodshop
        yaw: 260
        pitch: 0
        label: Back to Woodshop
    connections:
      - garden
      - woodshop

  - id: garden
    name: Garden
    media: garden-placeholder.jpg
    thumbnail: garden-placeholder-thumb.jpg
    description: Outdoor learning space.
    hotspots:
      - target: culinary
        yaw: 180
        pitch: 0
        label: To Culinary
      - target: visual-arts
        yaw: 260
        pitch: 0
        label: To Visual Arts
    connections:
      - culinary
      - visual-arts

  - id: culinary
    name: Culinary Arts
    media: culinary-placeholder.jpg
    thumbnail: culinary-placeholder-thumb.jpg
    description: Culinary program kitchens.
    hotspots:
      - target: music
        yaw: 200
        pitch: 0
        label: To Music
      - target: garden
        yaw: 0
        pitch: 0
        label: Back to Garden
    connections:
      - music
      - garden

  - id: music
    name: Music
    media: music-placeholder.jpg
    thumbnail: music-placeholder-thumb.jpg
    description: Band and music classrooms.
    hotspots:
      - target: student-events
        yaw: 300
        pitch: 0
        label: To Student Events
      - target: culinary
        yaw: 20
        pitch: 0
        label: Back to Culinary
    connections:
      - student-events
      - culinary

  - id: student-events
    name: Student Events
    media: student-events-placeholder.jpg
    thumbnail: student-events-placeholder-thumb.jpg
    description: Area for student activities and gatherings.
    hotspots:
      - target: performing-arts
        yaw: 260
        pitch: 0
        label: To Performing Arts
      - target: music
        yaw: 100
        pitch: 0
        label: Back to Music
    connections:
      - performing-arts
      - music

  - id: performing-arts
    name: Performing Arts
    media: performing-arts-placeholder.jpg
    thumbnail: performing-arts-placeholder-thumb.jpg
    description: Theater and performance space.
    hotspots:
      - target: visual-arts
        yaw: 60
        pitch: 0
        label: To Visual Arts
      - target: senior-lawn
        yaw: 200
        pitch: 0
        label: Back to Lawn
    connections:
      - visual-arts
      - senior-lawn

  - id: visual-arts
    name: Visual Arts
    media: visual-arts-placeholder.jpg
    thumbnail: visual-arts-placeholder-thumb.jpg
    description: Art classrooms and studios.
    hotspots:
      - target: garden
        yaw: 90
        pitch: 0
        label: To Garden
      - target: performing-arts
        yaw: 240
        pitch: 0
        label: Back to Performing Arts
    connections:
      - garden
      - performing-arts

  - id: gym
    name: Gymnasium
    media: gym-placeholder.jpg
    thumbnail: gym-placeholder-thumb.jpg
    description: Indoor sports facility.
    hotspots:
      - target: pool
        yaw: 30
        pitch: 0
        label: To Pool
      - target: stadium
        yaw: 200
        pitch: 0
        label: To Stadium
      - target: main-entrance
        yaw: 300
        pitch: 0
        label: Back to Entrance
    connections:
      - pool
      - stadium
      - main-entrance

  - id: pool
    name: Pool
    media: pool-placeholder.jpg
    thumbnail: pool-placeholder-thumb.jpg
    description: Aquatics facility.
    hotspots:
      - target: baseball-field
        yaw: 90
        pitch: 0
        label: To Baseball Field
      - target: gym
        yaw: 260
        pitch: 0
        label: Back to Gym
    connections:
      - baseball-field
      - gym

  - id: baseball-field
    name: Baseball Field
    media: baseball-field-placeholder.jpg
    thumbnail: baseball-field-placeholder-thumb.jpg
    description: Home of the baseball team.
    hotspots:
      - target: pool
        yaw: 270
        pitch: 0
        label: Back to Pool
      - target: softball-field
        yaw: 30
        pitch: 0
        label: To Softball Field
    connections:
      - pool
      - softball-field

  - id: stadium
    name: Stadium
    media: stadium-placeholder.jpg
    thumbnail: stadium-placeholder-thumb.jpg
    description: The main stadium for sports and events.
    hotspots:
      - target: tennis-courts
        yaw: 20
        pitch: 0
        label: To Tennis Courts
      - target: gym
        yaw: 120
        pitch: 0
        label: Back to Gym
    connections:
      - tennis-courts
      - gym

  - id: tennis-courts
    name: Tennis Courts
    media: tennis-courts-placeholder.jpg
    thumbnail: tennis-courts-placeholder-thumb.jpg
    description: Outdoor tennis courts.
    hotspots:
      - target: softball-field
        yaw: 40
        pitch: 0
        label: To Softball Field
      - target: stadium
        yaw: 200
        pitch: 0
        label: Back to Stadium
    connections:
      - softball-field
      - stadium

  - id: softball-field
    name: Softball Field
    media: softball-field-placeholder.jpg
    thumbnail: softball-field-placeholder-thumb.jpg
    description: Softball field.
    hotspots:
      - target: tennis-courts
        yaw: 220
        pitch: 0
        label: Back to Tennis Courts
      - target: baseball-field
        yaw: 40
        pitch: 0
        label: To Baseball Field
    connections:
      - tennis-courts
      - baseball-field
```

- [ ] **Step 1.2: Create `tours/academics-tour.yaml`**

```yaml
name: Academics Tour
description: Explore the classrooms, library, and academic facilities at SBHS.
thumbnail: academics-tour-thumb.jpg
startLocation: main-entrance

locations:
  - id: main-entrance
    name: Main Entrance
    media: main-entrance-placeholder.jpg
    thumbnail: main-entrance-placeholder-thumb.jpg
    description: Welcome to Santa Barbara High School!
    overlays:
      - text: Founded in 1875
        yaw: 180
        pitch: 15
    hotspots:
      - target: senior-lawn
        yaw: 0
        pitch: 0
        label: Toward Senior Lawn
    connections:
      - senior-lawn

  - id: senior-lawn
    name: Senior Lawn
    media: senior-lawn-placeholder.jpg
    thumbnail: senior-lawn-placeholder-thumb.jpg
    description: A central gathering space for students.
    hotspots:
      - target: library
        yaw: 90
        pitch: 0
        label: To Library
      - target: main-entrance
        yaw: 180
        pitch: 0
        label: Back to Entrance
    connections:
      - library
      - main-entrance

  - id: library
    name: Library
    media: library-placeholder.jpg
    thumbnail: library-placeholder-thumb.jpg
    description: A quiet place for studying and research.
    hotspots:
      - target: translation
        yaw: 20
        pitch: 0
        label: To Translation Center
      - target: senior-lawn
        yaw: 180
        pitch: 0
        label: Back to Lawn
    connections:
      - translation
      - senior-lawn

  - id: translation
    name: Translation Center
    media: translation-placeholder.jpg
    thumbnail: translation-placeholder-thumb.jpg
    description: Support services for multilingual students.
    hotspots:
      - target: science
        yaw: 45
        pitch: 0
        label: To Science
      - target: library
        yaw: 220
        pitch: 0
        label: Back to Library
    connections:
      - science
      - library

  - id: science
    name: Science Building
    media: science-placeholder.jpg
    thumbnail: science-placeholder-thumb.jpg
    description: Science classrooms and labs.
    hotspots:
      - target: math
        yaw: 90
        pitch: 0
        label: To Math
      - target: english
        yaw: 30
        pitch: 0
        label: To English
      - target: translation
        yaw: 220
        pitch: 0
        label: Back to Translation
    connections:
      - math
      - english
      - translation

  - id: math
    name: Math Building
    media: math-placeholder.jpg
    thumbnail: math-placeholder-thumb.jpg
    description: Math classrooms.
    hotspots:
      - target: science
        yaw: 270
        pitch: 0
        label: Back to Science
    connections:
      - science

  - id: english
    name: English Building
    media: english-placeholder.jpg
    thumbnail: english-placeholder-thumb.jpg
    description: English classrooms.
    hotspots:
      - target: science
        yaw: 200
        pitch: 0
        label: Back to Science
    connections:
      - science
```

- [ ] **Step 1.3: Create `tours/athletics-tour.yaml`**

```yaml
name: Athletics Tour
description: See the gym, pool, stadium, and athletic fields at SBHS.
thumbnail: athletics-tour-thumb.jpg
startLocation: main-entrance

locations:
  - id: main-entrance
    name: Main Entrance
    media: main-entrance-placeholder.jpg
    thumbnail: main-entrance-placeholder-thumb.jpg
    description: Welcome to Santa Barbara High School!
    hotspots:
      - target: gym
        yaw: 120
        pitch: -5
        label: Toward Gym & Athletics
    connections:
      - gym

  - id: gym
    name: Gymnasium
    media: gym-placeholder.jpg
    thumbnail: gym-placeholder-thumb.jpg
    description: Indoor sports facility — home of the Dons.
    hotspots:
      - target: pool
        yaw: 30
        pitch: 0
        label: To Pool
      - target: stadium
        yaw: 200
        pitch: 0
        label: To Stadium
      - target: main-entrance
        yaw: 300
        pitch: 0
        label: Back to Entrance
    connections:
      - pool
      - stadium
      - main-entrance

  - id: pool
    name: Pool
    media: pool-placeholder.jpg
    thumbnail: pool-placeholder-thumb.jpg
    description: Aquatics facility.
    hotspots:
      - target: baseball-field
        yaw: 90
        pitch: 0
        label: To Baseball Field
      - target: gym
        yaw: 260
        pitch: 0
        label: Back to Gym
    connections:
      - baseball-field
      - gym

  - id: baseball-field
    name: Baseball Field
    media: baseball-field-placeholder.jpg
    thumbnail: baseball-field-placeholder-thumb.jpg
    description: Home of the SBHS baseball team.
    hotspots:
      - target: softball-field
        yaw: 30
        pitch: 0
        label: To Softball Field
      - target: pool
        yaw: 270
        pitch: 0
        label: Back to Pool
    connections:
      - softball-field
      - pool

  - id: softball-field
    name: Softball Field
    media: softball-field-placeholder.jpg
    thumbnail: softball-field-placeholder-thumb.jpg
    description: Softball field.
    hotspots:
      - target: tennis-courts
        yaw: 220
        pitch: 0
        label: To Tennis Courts
      - target: baseball-field
        yaw: 40
        pitch: 0
        label: Back to Baseball
    connections:
      - tennis-courts
      - baseball-field

  - id: tennis-courts
    name: Tennis Courts
    media: tennis-courts-placeholder.jpg
    thumbnail: tennis-courts-placeholder-thumb.jpg
    description: Outdoor tennis courts.
    hotspots:
      - target: stadium
        yaw: 200
        pitch: 0
        label: To Stadium
      - target: softball-field
        yaw: 40
        pitch: 0
        label: Back to Softball
    connections:
      - stadium
      - softball-field

  - id: stadium
    name: Stadium
    media: stadium-placeholder.jpg
    thumbnail: stadium-placeholder-thumb.jpg
    description: The main stadium for sports and events.
    hotspots:
      - target: gym
        yaw: 120
        pitch: 0
        label: Back to Gym
      - target: tennis-courts
        yaw: 20
        pitch: 0
        label: To Tennis Courts
    connections:
      - gym
      - tennis-courts
```

- [ ] **Step 1.4: Create `tours/arts-tour.yaml`**

```yaml
name: Arts Tour
description: Discover the performing arts, visual arts, and music programs at SBHS.
thumbnail: arts-tour-thumb.jpg
startLocation: main-entrance

locations:
  - id: main-entrance
    name: Main Entrance
    media: main-entrance-placeholder.jpg
    thumbnail: main-entrance-placeholder-thumb.jpg
    description: Welcome to Santa Barbara High School!
    hotspots:
      - target: performing-arts
        yaw: 0
        pitch: 0
        label: Toward Performing Arts
    connections:
      - performing-arts

  - id: performing-arts
    name: Performing Arts
    media: performing-arts-placeholder.jpg
    thumbnail: performing-arts-placeholder-thumb.jpg
    description: Theater and performance space.
    hotspots:
      - target: visual-arts
        yaw: 60
        pitch: 0
        label: To Visual Arts
      - target: student-events
        yaw: 300
        pitch: 0
        label: To Student Events
      - target: main-entrance
        yaw: 200
        pitch: 0
        label: Back to Entrance
    connections:
      - visual-arts
      - student-events
      - main-entrance

  - id: visual-arts
    name: Visual Arts
    media: visual-arts-placeholder.jpg
    thumbnail: visual-arts-placeholder-thumb.jpg
    description: Art classrooms and studios.
    hotspots:
      - target: music
        yaw: 90
        pitch: 0
        label: To Music
      - target: performing-arts
        yaw: 240
        pitch: 0
        label: Back to Performing Arts
    connections:
      - music
      - performing-arts

  - id: music
    name: Music
    media: music-placeholder.jpg
    thumbnail: music-placeholder-thumb.jpg
    description: Band and music classrooms.
    hotspots:
      - target: visual-arts
        yaw: 270
        pitch: 0
        label: Back to Visual Arts
      - target: student-events
        yaw: 0
        pitch: 0
        label: To Student Events
    connections:
      - visual-arts
      - student-events

  - id: student-events
    name: Student Events
    media: student-events-placeholder.jpg
    thumbnail: student-events-placeholder-thumb.jpg
    description: Area for student activities and gatherings.
    hotspots:
      - target: performing-arts
        yaw: 260
        pitch: 0
        label: Back to Performing Arts
      - target: music
        yaw: 100
        pitch: 0
        label: Back to Music
    connections:
      - performing-arts
      - music
```

- [ ] **Step 1.5: Create `tours/career-tech-tour.yaml`**

```yaml
name: Career Tech Pathways
description: Explore the CTE programs including woodshop, culinary arts, and more at SBHS.
thumbnail: career-tech-tour-thumb.jpg
startLocation: main-entrance

locations:
  - id: main-entrance
    name: Main Entrance
    media: main-entrance-placeholder.jpg
    thumbnail: main-entrance-placeholder-thumb.jpg
    description: Welcome to Santa Barbara High School!
    hotspots:
      - target: woodshop
        yaw: 0
        pitch: 0
        label: Toward Career Tech
    connections:
      - woodshop

  - id: woodshop
    name: Woodshop / MAD Academy
    media: woodshop-placeholder.jpg
    thumbnail: woodshop-placeholder-thumb.jpg
    description: Hands-on learning and design programs.
    hotspots:
      - target: sports-med
        yaw: 90
        pitch: 0
        label: To Sports Medicine
      - target: main-entrance
        yaw: 220
        pitch: 0
        label: Back to Entrance
    connections:
      - sports-med
      - main-entrance

  - id: sports-med
    name: Sports Medicine
    media: sports-med-placeholder.jpg
    thumbnail: sports-med-placeholder-thumb.jpg
    description: Sports medicine and health programs.
    hotspots:
      - target: garden
        yaw: 160
        pitch: 0
        label: To Garden
      - target: woodshop
        yaw: 260
        pitch: 0
        label: Back to Woodshop
    connections:
      - garden
      - woodshop

  - id: garden
    name: Garden
    media: garden-placeholder.jpg
    thumbnail: garden-placeholder-thumb.jpg
    description: Outdoor learning and sustainability space.
    hotspots:
      - target: culinary
        yaw: 180
        pitch: 0
        label: To Culinary Arts
      - target: sports-med
        yaw: 0
        pitch: 0
        label: Back to Sports Med
    connections:
      - culinary
      - sports-med

  - id: culinary
    name: Culinary Arts
    media: culinary-placeholder.jpg
    thumbnail: culinary-placeholder-thumb.jpg
    description: Culinary program kitchens and teaching labs.
    hotspots:
      - target: garden
        yaw: 0
        pitch: 0
        label: Back to Garden
    connections:
      - garden
```

- [ ] **Step 1.6: Delete the retired tour files**

```bash
git rm tours/homepage-tour.yaml tours/example-campus-tour.yaml_
```

- [ ] **Step 1.7: Run schema validation to confirm all 5 files pass**

```bash
cd /path/to/vrtours-2026 && npm run test:schema
```

Expected output: something like `✓ campus-tour.yaml`, `✓ academics-tour.yaml`, etc. — all 5 pass, no errors.

- [ ] **Step 1.8: Commit**

```bash
git add tours/
git commit -m "feat: add 5 themed tour YAML files, retire homepage-tour and example-campus-tour"
```

---

## Task 2: Add homepage overlay div to index.html

**Files:**
- Modify: `app/index.html`

- [ ] **Step 2.1: Add the homepage div and its base styles**

Open `app/index.html`. Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SBHS VR Tours</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #app { width: 100%; height: 100%; }
    canvas { width: 100%; height: 100%; display: block; touch-action: none; }
    #homepage {
      position: fixed;
      inset: 0;
      z-index: 10;
      background: #0d1f0e;
      color: #ffffff;
      font-family: sans-serif;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <canvas id="app"></canvas>
  <div id="homepage"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2.2: Commit**

```bash
git add app/index.html
git commit -m "feat: add homepage overlay div to index.html"
```

---

## Task 3: Add happy-dom and write failing tests for homepage.js

**Files:**
- Modify: `app/package.json`
- Create: `app/tests/homepage.test.js`

- [ ] **Step 3.1: Install happy-dom**

```bash
cd app && npm install --save-dev happy-dom
```

- [ ] **Step 3.2: Write the failing tests**

Create `app/tests/homepage.test.js`:

```js
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showHomepage, hideHomepage } from '../src/homepage.js';

const TOURS = [
  { id: 'campus-tour', name: 'Full Campus Tour', description: 'See the whole campus.', thumbnail: 'campus-tour-thumb.jpg' },
  { id: 'academics-tour', name: 'Academics Tour', description: 'Classrooms and library.', thumbnail: 'academics-tour-thumb.jpg' },
  { id: 'athletics-tour', name: 'Athletics Tour', description: 'Gym, pool, and fields.', thumbnail: 'athletics-tour-thumb.jpg' },
  { id: 'arts-tour', name: 'Arts Tour', description: 'Visual arts and theater.', thumbnail: 'arts-tour-thumb.jpg' },
  { id: 'career-tech-tour', name: 'Career Tech Pathways', description: 'CTE programs.', thumbnail: 'career-tech-tour-thumb.jpg' },
];

beforeEach(() => {
  document.body.innerHTML = '<canvas id="app"></canvas><div id="homepage"></div>';
});

describe('showHomepage', () => {
  it('makes the homepage element visible', () => {
    showHomepage(TOURS, vi.fn());
    const el = document.getElementById('homepage');
    expect(el.style.display).not.toBe('none');
    expect(el.style.opacity).not.toBe('0');
  });

  it('renders a selectable element for every tour', () => {
    showHomepage(TOURS, vi.fn());
    const el = document.getElementById('homepage');
    const tourEls = el.querySelectorAll('[data-tour-id]');
    expect(tourEls).toHaveLength(5);
  });

  it('calls onSelect with the correct tour id when a tour is clicked', () => {
    const onSelect = vi.fn();
    showHomepage(TOURS, onSelect);
    const el = document.getElementById('homepage');
    const campusCard = el.querySelector('[data-tour-id="campus-tour"]');
    campusCard.click();
    expect(onSelect).toHaveBeenCalledWith('campus-tour');
  });

  it('calls onSelect with the academics tour id when that card is clicked', () => {
    const onSelect = vi.fn();
    showHomepage(TOURS, onSelect);
    const el = document.getElementById('homepage');
    el.querySelector('[data-tour-id="academics-tour"]').click();
    expect(onSelect).toHaveBeenCalledWith('academics-tour');
  });

  it('calling showHomepage twice does not duplicate tour elements', () => {
    showHomepage(TOURS, vi.fn());
    showHomepage(TOURS, vi.fn());
    const el = document.getElementById('homepage');
    expect(el.querySelectorAll('[data-tour-id]')).toHaveLength(5);
  });
});

describe('hideHomepage', () => {
  it('returns a Promise', () => {
    showHomepage(TOURS, vi.fn());
    const result = hideHomepage();
    expect(result).toBeInstanceOf(Promise);
  });

  it('sets display:none after the fade', async () => {
    showHomepage(TOURS, vi.fn());
    await hideHomepage();
    const el = document.getElementById('homepage');
    expect(el.style.display).toBe('none');
  });
});
```

- [ ] **Step 3.3: Run tests — confirm they all fail**

```bash
cd app && npm run test:client -- homepage.test.js
```

Expected: all 6 tests **FAIL** with "Cannot find module '../src/homepage.js'".

- [ ] **Step 3.4: Commit the failing tests**

```bash
git add app/tests/homepage.test.js app/package.json app/package-lock.json
git commit -m "test: add failing tests for homepage.js"
```

---

## Task 4: Implement homepage.js to pass the tests

**Files:**
- Create: `app/src/homepage.js`

- [ ] **Step 4.1: Create `app/src/homepage.js`**

```js
const C = {
  bg: '#0d1f0e',
  bgDark: '#091509',
  card: '#122614',
  cardBorder: '#1e3a20',
  gold: '#c9a84c',
  goldDark: '#a8872e',
  text: '#ffffff',
  muted: '#6a8a6c',
  heroBg: 'linear-gradient(160deg, #0d2a0f, #091a0a)',
};

const EMOJI = {
  'campus-tour': '🗺️',
  'academics-tour': '📚',
  'athletics-tour': '🏟️',
  'arts-tour': '🎨',
  'career-tech-tour': '🔧',
};

function injectStyles() {
  if (document.getElementById('hp-styles')) return;
  const s = document.createElement('style');
  s.id = 'hp-styles';
  s.textContent = `
    #homepage * { box-sizing: border-box; }
    .hp-desktop { display: block; }
    .hp-mobile { display: none; }
    @media (max-width: 767px) {
      .hp-desktop { display: none !important; }
      .hp-mobile { display: block !important; }
    }
    [data-tour-id] { cursor: pointer; }
    [data-tour-id]:hover { filter: brightness(1.15); }
  `;
  document.head.appendChild(s);
}

function nav() {
  return `
    <div style="background:${C.bgDark};padding:10px 16px;display:flex;align-items:center;
                justify-content:space-between;border-bottom:1px solid ${C.cardBorder};">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:22px;height:22px;background:${C.gold};border-radius:50%;
                    display:flex;align-items:center;justify-content:center;">
          <span style="color:${C.bg};font-size:10px;font-weight:bold;">D</span>
        </div>
        <span style="font-size:13px;font-weight:bold;letter-spacing:0.5px;">SBHS Virtual Tours</span>
      </div>
      <span style="color:${C.muted};font-size:11px;">Santa Barbara High School</span>
    </div>`;
}

function hero(compact) {
  if (compact) {
    return `
      <div style="background:${C.heroBg};padding:14px;text-align:center;
                  border-bottom:1px solid ${C.cardBorder};">
        <div style="font-size:15px;font-weight:bold;margin-bottom:2px;">Santa Barbara High</div>
        <div style="color:${C.muted};font-size:11px;">Choose a tour to explore</div>
      </div>`;
  }
  return `
    <div style="background:${C.heroBg};padding:24px 20px 18px;text-align:center;
                border-bottom:1px solid ${C.cardBorder};">
      <div style="color:${C.gold};font-size:9px;letter-spacing:3px;text-transform:uppercase;
                  margin-bottom:6px;">Welcome to</div>
      <div style="font-size:22px;font-weight:bold;margin-bottom:4px;">Santa Barbara High School</div>
      <div style="color:${C.muted};font-size:12px;">Explore our campus in 360° — choose a tour to begin</div>
    </div>`;
}

function campusCta(tour) {
  const emoji = EMOJI[tour.id] ?? '🗺️';
  return `
    <div data-tour-id="${tour.id}" style="background:linear-gradient(90deg,${C.gold},${C.goldDark});
         border-radius:8px;padding:14px 16px;display:flex;align-items:center;
         justify-content:space-between;">
      <div>
        <div style="color:${C.bg};font-size:13px;font-weight:bold;">${emoji} ${tour.name}</div>
        <div style="color:rgba(13,31,14,0.7);font-size:11px;">${tour.description}</div>
      </div>
      <div style="color:${C.bg};font-size:18px;">▶</div>
    </div>`;
}

function themedGrid(tours) {
  const cards = tours.map(t => {
    const emoji = EMOJI[t.id] ?? '🎓';
    return `
      <div data-tour-id="${t.id}" style="background:${C.card};border-radius:8px;padding:14px;
           border:1px solid ${C.cardBorder};">
        <div style="font-size:22px;margin-bottom:6px;">${emoji}</div>
        <div style="font-size:13px;font-weight:bold;margin-bottom:3px;">${t.name}</div>
        <div style="color:${C.muted};font-size:11px;">${t.description}</div>
      </div>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${cards}</div>`;
}

function themedList(tours) {
  return tours.map(t => {
    const emoji = EMOJI[t.id] ?? '🎓';
    return `
      <div data-tour-id="${t.id}" style="background:${C.card};border-radius:6px;padding:12px;
           display:flex;align-items:center;justify-content:space-between;
           border:1px solid ${C.cardBorder};">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">${emoji}</span>
          <div>
            <div style="font-size:13px;font-weight:bold;">${t.name}</div>
            <div style="color:${C.muted};font-size:11px;">${t.description}</div>
          </div>
        </div>
        <div style="color:${C.gold};font-size:16px;">›</div>
      </div>`;
  }).join('');
}

export function showHomepage(tours, onSelect) {
  injectStyles();

  const el = document.getElementById('homepage');
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 10;
    background: ${C.bg}; color: ${C.text};
    font-family: sans-serif; overflow-y: auto;
    opacity: 1; display: block; pointer-events: all;
  `;

  const campus = tours.find(t => t.id === 'campus-tour');
  const themed = tours.filter(t => t.id !== 'campus-tour');

  el.innerHTML = `
    ${nav()}
    <div class="hp-desktop">
      ${hero(false)}
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
        ${themedGrid(themed)}
        ${campus ? campusCta(campus) : ''}
      </div>
    </div>
    <div class="hp-mobile">
      ${hero(true)}
      <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
        ${campus ? campusCta(campus) : ''}
        ${themedList(themed)}
      </div>
    </div>
  `;

  el.addEventListener('click', (e) => {
    const card = e.target.closest('[data-tour-id]');
    if (card) onSelect(card.dataset.tourId);
  });
}

export function hideHomepage() {
  return new Promise(resolve => {
    const el = document.getElementById('homepage');
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.cssText = 'display: none;';
      resolve();
    }, 300);
  });
}
```

- [ ] **Step 4.2: Run tests — confirm they all pass**

```bash
cd app && npm run test:client -- homepage.test.js
```

Expected: all 6 tests **PASS**.

- [ ] **Step 4.3: Run the full test suite to check for regressions**

```bash
cd app && npm test
```

Expected: all tests pass (schema + client).

- [ ] **Step 4.4: Commit**

```bash
git add app/src/homepage.js
git commit -m "feat: implement homepage.js with responsive tour selection UI"
```

---

## Task 5: Refactor main.js for the multi-tour flow

**Files:**
- Modify: `app/src/main.js`

- [ ] **Step 5.1: Replace `app/src/main.js` with the refactored version**

```js
import {
  Engine, Scene, ArcRotateCamera, Vector3, PhotoDome, VideoDome,
  MeshBuilder, StandardMaterial, Color3
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui';

import { getConfig, isDevMode } from './config.js';
import { TourLoader } from './tour-loader.js';
import { SceneManager } from './scene-manager.js';
import { HotspotSystem } from './hotspot-system.js';
import { OverlaySystem } from './overlay-system.js';
import { LocationPicker } from './location-picker.js';
import {
  detectPlatform, getResolutionTier, checkVRSupport, setupInput, enableDevCoordinates
} from './platform-adapter.js';
import { showHomepage, hideHomepage } from './homepage.js';

function createFadeOverlay(scene) {
  const plane = MeshBuilder.CreatePlane('fade-overlay', { size: 100 }, scene);
  plane.position = new Vector3(0, 0, 0.5);
  plane.billboardMode = 7;
  const mat = new StandardMaterial('fade-mat', scene);
  mat.emissiveColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.alpha = 0;
  plane.material = mat;
  plane.isPickable = false;
  plane.renderingGroupId = 1;
  return { plane, mat };
}

function animateAlpha(mat, from, to, duration) {
  return new Promise(resolve => {
    const start = performance.now();
    function step() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      mat.alpha = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

const config = getConfig();
const devMode = isDevMode(window.location.href);

let engine = null;
let currentScene = null;
let allTourData = [];

async function returnToHomepage() {
  if (currentScene) {
    currentScene.dispose();
    currentScene = null;
  }
  if (engine) engine.stopRenderLoop();
  const tourMeta = allTourData.map(({ id, name, description, thumbnail }) => ({
    id, name, description, thumbnail
  }));
  showHomepage(tourMeta, startTour);
}

async function startTour(tourId) {
  const tourData = allTourData.find(t => t.id === tourId);
  if (!tourData) { console.error(`Tour not found: ${tourId}`); return; }

  await hideHomepage();

  const canvas = document.getElementById('app');
  if (!engine) {
    engine = new Engine(canvas, true);
    window.addEventListener('resize', () => engine.resize());
  }

  currentScene = new Scene(engine);
  const scene = currentScene;

  let platform = detectPlatform(navigator);
  const vrSupported = await checkVRSupport();
  if (vrSupported) platform = 'vr';
  const resolution = getResolutionTier(platform);

  const camera = new ArcRotateCamera('camera', 0, Math.PI / 2, 0.1, Vector3.Zero(), scene);
  setupInput(scene, camera, platform);

  const fade = createFadeOverlay(scene);

  async function createPhotoDome(_scene, url) {
    if (url.endsWith('.mp4')) {
      return new VideoDome('videodome', url, { resolution: 32, size: 1000, loop: true, autoPlay: true }, _scene);
    }
    return new PhotoDome('photodome', url, { resolution: 32, size: 1000 }, _scene);
  }

  async function animateFade(_scene, direction) {
    if (direction === 'out') await animateAlpha(fade.mat, 0, 1, 300);
    else await animateAlpha(fade.mat, 1, 0, 300);
  }

  const tourLoader = new TourLoader(config);
  const sceneManager = new SceneManager(scene, engine, { createPhotoDome, animateFade });
  const hotspotSystem = new HotspotSystem({ radius: 8 });
  const overlaySystem = new OverlaySystem({ radius: 9 });
  const locationPicker = new LocationPicker();

  tourLoader.loadTour(tourData);

  const fullscreenUI = AdvancedDynamicTexture.CreateFullscreenUI('ui');
  locationPicker.setLocations(tourLoader.getAllLocations(), config.mediaBaseUrl);
  locationPicker.buildPickerUI(fullscreenUI);

  const menuBtn = Button.CreateSimpleButton('menu-btn', '☰');
  menuBtn.width = '50px';
  menuBtn.height = '50px';
  menuBtn.color = 'white';
  menuBtn.background = 'rgba(0,0,0,0.5)';
  menuBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  menuBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  menuBtn.top = '10px';
  menuBtn.left = '-10px';
  menuBtn.onPointerClickObservable.add(() => locationPicker.toggle());
  fullscreenUI.addControl(menuBtn);

  const changeTourBtn = Button.CreateSimpleButton('change-tour-btn', '← Tours');
  changeTourBtn.width = '80px';
  changeTourBtn.height = '50px';
  changeTourBtn.color = 'white';
  changeTourBtn.background = 'rgba(0,0,0,0.5)';
  changeTourBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  changeTourBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  changeTourBtn.top = '10px';
  changeTourBtn.left = '10px';
  changeTourBtn.onPointerClickObservable.add(() => returnToHomepage());
  fullscreenUI.addControl(changeTourBtn);

  async function navigateTo(locationId) {
    const location = tourLoader.getLocation(locationId);
    if (!location) return;
    const mediaUrl = tourLoader.resolveMediaUrl(location.media, resolution);
    hotspotSystem.clearHotspots();
    overlaySystem.clearOverlays();
    await sceneManager.transitionTo(locationId, mediaUrl);
    const hotspotData = hotspotSystem.createHotspotData(location.hotspots);
    hotspotSystem.placeHotspots(scene, hotspotData);
    const overlayData = overlaySystem.createOverlayData(location.overlays);
    overlaySystem.placeOverlays(scene, overlayData);
    locationPicker.setCurrentLocation(locationId);
    locationPicker.updateUI();
  }

  locationPicker.onSelect = (id) => { locationPicker.toggle(); navigateTo(id); };

  scene.onPointerDown = (_evt, pickResult) => {
    if (pickResult.hit && pickResult.pickedMesh?.metadata?.target) {
      navigateTo(pickResult.pickedMesh.metadata.target);
    }
  };

  if (devMode) enableDevCoordinates(scene);

  if (vrSupported) {
    await scene.createDefaultXRExperienceAsync({ floorMeshes: [] });
  }

  await navigateTo(tourLoader.startLocationId);

  engine.runRenderLoop(() => scene.render());
}

async function initHomepage() {
  const index = await fetch('/tours/index.json').then(r => r.json());
  const dataList = await Promise.all(index.map(f => fetch(`/tours/${f}`).then(r => r.json())));
  allTourData = dataList.map((data, i) => ({
    ...data,
    id: index[i].replace('.json', ''),
  }));
  const tourMeta = allTourData.map(({ id, name, description, thumbnail }) => ({
    id, name, description, thumbnail
  }));
  showHomepage(tourMeta, startTour);
}

initHomepage().catch(console.error);
```

- [ ] **Step 5.2: Run the full test suite**

```bash
cd app && npm test
```

Expected: all tests pass. The refactor only moves code, it does not change module behavior.

- [ ] **Step 5.3: Start the dev server and manually verify the homepage**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- Homepage appears with dark green background and gold accents
- 5 tour cards are visible
- Clicking any tour card dismisses the homepage and starts that tour
- The "← Tours" button is visible in the top-left inside a tour
- Clicking "← Tours" returns to the homepage
- Resizing below 768px switches to the list layout (Layout B)

- [ ] **Step 5.4: Commit**

```bash
git add app/src/main.js
git commit -m "feat: refactor main.js for multi-tour homepage flow with Change Tour button"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 5 YAML files — Task 1
- ✅ Homepage overlay DOM element — Task 2
- ✅ `homepage.js` with `showHomepage` / `hideHomepage` — Task 4
- ✅ Responsive layout (A desktop, B mobile, 768px breakpoint) — Task 4, Step 4.1
- ✅ Dark green + gold SBHS colors — Task 4, Step 4.1 (color constants)
- ✅ App flow: load metadata → show homepage → on select → start tour — Task 5, Step 5.1
- ✅ Babylon.js engine created once, reused — Task 5, Step 5.1 (`engine` module-level var)
- ✅ "Change Tour" button top-left — Task 5, Step 5.1
- ✅ `returnToHomepage()` disposes scene, keeps engine — Task 5, Step 5.1
- ✅ Unit tests for `homepage.js` — Task 3 + Task 4
- ✅ Schema validation covers new YAMLs automatically — Task 1, Step 1.7
- ✅ `homepage-tour.yaml` and `example-campus-tour.yaml_` deleted — Task 1, Step 1.6
