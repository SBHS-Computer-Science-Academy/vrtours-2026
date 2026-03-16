# SBHS WebXR Campus Tour — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WebXR 360° campus tour app where users navigate between equirectangular photo locations via hotspots and a location picker menu, driven by YAML tour definitions.

**Architecture:** Split static app (Vite + Babylon.js) deployed to Cloudflare Pages/Vercel/Netlify, with media assets on Cloudflare R2. Tours defined in YAML, validated by JSON Schema, converted to JSON at build time. Three teams (App, Tour Design, Media) connected by a shared schema.

**Tech Stack:** Babylon.js 7.x, Vite 6.x, Vitest, sharp, @aws-sdk/client-s3, ajv (JSON Schema validation), js-yaml

---

## File Structure

```
vrtours-2026/
  app/
    package.json                    # Dependencies, scripts (dev, build, test, test:schema, test:client)
    vite.config.js                  # Vite config + YAML-to-JSON build plugin
    .env.example                    # Documents VITE_MEDIA_BASE_URL
    public/
      index.html                    # Shell HTML with <canvas> mount point
    src/
      main.js                       # Entry point — boots Babylon engine, loads tour, wires modules
      config.js                     # Reads VITE_MEDIA_BASE_URL, resolution tiers, dev mode flag
      tour-loader.js                # Parses tour JSON, builds location graph, resolves media paths
      scene-manager.js              # PhotoDome lifecycle, fade transitions
      hotspot-system.js             # 3D billboard hotspot placement + interaction
      overlay-system.js             # Semi-transparent text card placement
      location-picker.js            # 2D GUI panel listing all tour locations
      platform-adapter.js           # Detects VR/desktop/mobile, configures input, dev mode coordinates
      math-utils.js                 # yaw/pitch → Vector3 conversion (shared by hotspots + overlays)
    tests/
      config.test.js
      tour-loader.test.js
      scene-manager.test.js
      hotspot-system.test.js
      overlay-system.test.js
      location-picker.test.js
      platform-adapter.test.js
      math-utils.test.js
      fixtures/
        valid-tour.json             # Test fixture — valid tour data
        invalid-tour-missing-start.json
        invalid-tour-bad-connection.json
  schema/
    tour-schema.json                # JSON Schema definition
    validate.js                     # CLI script: validates tours/*.yaml against schema
    validate.test.js                # Tests for the validator itself
    package.json                    # ajv, js-yaml dependencies
  media/
    scripts/
      build.js                      # Reads originals/, resizes with sharp, writes variants + manifest
      sync.js                       # Uploads to R2 via S3-compatible API
      build.test.js                 # Tests for build script
      package.json                  # sharp, @aws-sdk/client-s3 dependencies
  tours/
    example-campus-tour.yaml        # Updated to match finalized schema
```

**Key decomposition decisions:**
- `math-utils.js` extracted because yaw/pitch→Vector3 is shared by hotspots and overlays — avoids duplication
- `config.js` extracted so environment/resolution logic is tested independently of Babylon.js
- `schema/` has its own `package.json` — it's a standalone tool the Tour Design team runs independently
- `media/scripts/` has its own `package.json` — Media team runs it independently
- `app/` has the main `package.json` with workspace-level scripts that delegate to schema/ and media/

---

## Chunk 1: Foundation — Schema, Config, and Tour Loader

This chunk establishes the shared contract (JSON Schema), project scaffolding (Vite + dependencies), and the Tour Loader module that all other client modules depend on. No Babylon.js yet — purely data layer.

### Task 1: JSON Schema Definition

**Files:**
- Create: `schema/tour-schema.json`
- Create: `schema/package.json`

- [ ] **Step 1: Create schema/package.json**

```json
{
  "name": "vrtours-schema",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  },
  "scripts": {
    "validate": "node validate.js",
    "test": "vitest run"
  }
}
```

Run: `cd schema && npm install`

- [ ] **Step 2: Create the JSON Schema**

Create `schema/tour-schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VR Tour Definition",
  "description": "Schema for SBHS VR tour YAML files",
  "type": "object",
  "required": ["name", "description", "thumbnail", "startLocation", "locations"],
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "description": {
      "type": "string",
      "minLength": 1
    },
    "thumbnail": {
      "type": "string",
      "pattern": "^[a-z0-9]+(-[a-z0-9]+)*-thumb\\.jpg$"
    },
    "startLocation": {
      "type": "string",
      "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$"
    },
    "locations": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/location"
      }
    }
  },
  "$defs": {
    "location": {
      "type": "object",
      "required": ["id", "name", "media", "connections"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        },
        "media": {
          "type": "string",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*\\.jpg$"
        },
        "thumbnail": {
          "type": "string",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*-thumb\\.jpg$"
        },
        "hotspots": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/hotspot"
          }
        },
        "overlays": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/overlay"
          }
        },
        "connections": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$"
          }
        }
      }
    },
    "hotspot": {
      "type": "object",
      "required": ["target", "yaw", "pitch"],
      "additionalProperties": false,
      "properties": {
        "target": {
          "type": "string",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$"
        },
        "yaw": {
          "type": "number",
          "minimum": 0,
          "maximum": 360
        },
        "pitch": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        },
        "label": {
          "type": "string"
        }
      }
    },
    "overlay": {
      "type": "object",
      "required": ["text", "yaw", "pitch"],
      "additionalProperties": false,
      "properties": {
        "text": {
          "type": "string",
          "minLength": 1
        },
        "yaw": {
          "type": "number",
          "minimum": 0,
          "maximum": 360
        },
        "pitch": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        }
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add schema/package.json schema/package-lock.json schema/tour-schema.json
git commit -m "feat(schema): add JSON Schema for tour YAML validation"
```

### Task 2: Schema Validator CLI

**Files:**
- Create: `schema/validate.js`
- Create: `schema/validate.test.js`

- [ ] **Step 1: Write the failing test**

Create `schema/validate.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateTourYaml, validateTourData } from './validate.js';

const VALID_TOUR = {
  name: 'Test Tour',
  description: 'A test tour',
  thumbnail: 'test-tour-thumb.jpg',
  startLocation: 'entrance',
  locations: [
    {
      id: 'entrance',
      name: 'Entrance',
      media: 'entrance.jpg',
      connections: ['lobby'],
      hotspots: [
        { target: 'lobby', yaw: 90, pitch: 0, label: 'To Lobby' }
      ],
      overlays: [
        { text: 'Welcome!', yaw: 180, pitch: 10 }
      ]
    },
    {
      id: 'lobby',
      name: 'Lobby',
      media: 'lobby.jpg',
      connections: ['entrance']
    }
  ]
};

describe('validateTourData', () => {
  it('accepts a valid tour', () => {
    const result = validateTourData(VALID_TOUR);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects tour missing required fields', () => {
    const result = validateTourData({ name: 'Incomplete' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects tour with invalid startLocation reference', () => {
    const tour = {
      ...VALID_TOUR,
      startLocation: 'nonexistent'
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('startLocation') })
    );
  });

  it('rejects tour with connection to nonexistent location', () => {
    const tour = {
      ...VALID_TOUR,
      locations: [
        {
          id: 'entrance',
          name: 'Entrance',
          media: 'entrance.jpg',
          connections: ['nonexistent']
        }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('nonexistent') })
    );
  });

  it('rejects tour with hotspot targeting nonexistent location', () => {
    const tour = {
      ...VALID_TOUR,
      locations: [
        {
          id: 'entrance',
          name: 'Entrance',
          media: 'entrance.jpg',
          connections: [],
          hotspots: [{ target: 'ghost', yaw: 0, pitch: 0 }]
        }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('ghost') })
    );
  });

  it('rejects tour with duplicate location ids', () => {
    const tour = {
      ...VALID_TOUR,
      startLocation: 'entrance',
      locations: [
        { id: 'entrance', name: 'A', media: 'a.jpg', connections: [] },
        { id: 'entrance', name: 'B', media: 'b.jpg', connections: [] }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('duplicate') })
    );
  });

  it('rejects non-kebab-case media filename', () => {
    const tour = {
      ...VALID_TOUR,
      locations: [
        {
          id: 'entrance',
          name: 'Entrance',
          media: 'Main Entrance.jpg',
          connections: []
        }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd schema && npx vitest run validate.test.js`
Expected: FAIL — `validate.js` doesn't exist yet.

- [ ] **Step 3: Write the validator implementation**

Create `schema/validate.js`:

```js
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const schema = JSON.parse(readFileSync(join(__dirname, 'tour-schema.json'), 'utf-8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

/**
 * Validate tour data object against schema + semantic rules.
 * Returns { valid: boolean, errors: Array<{ path: string, message: string }> }
 */
export function validateTourData(data) {
  const errors = [];

  // Step 1: JSON Schema validation
  const schemaValid = validateSchema(data);
  if (!schemaValid) {
    for (const err of validateSchema.errors) {
      errors.push({
        path: err.instancePath || '/',
        message: `${err.instancePath || '/'}: ${err.message}`
      });
    }
    return { valid: false, errors };
  }

  // Step 2: Semantic validation (only if schema passes)
  const locationIds = new Set();
  const duplicates = new Set();

  for (const loc of data.locations) {
    if (locationIds.has(loc.id)) {
      duplicates.add(loc.id);
    }
    locationIds.add(loc.id);
  }

  for (const id of duplicates) {
    errors.push({
      path: '/locations',
      message: `duplicate location id: "${id}"`
    });
  }

  // startLocation must reference an existing location
  if (!locationIds.has(data.startLocation)) {
    errors.push({
      path: '/startLocation',
      message: `startLocation "${data.startLocation}" does not match any location id`
    });
  }

  // All connections must reference existing locations
  for (const loc of data.locations) {
    for (const conn of loc.connections) {
      if (!locationIds.has(conn)) {
        errors.push({
          path: `/locations/${loc.id}/connections`,
          message: `connection "${conn}" does not match any location id`
        });
      }
    }

    // All hotspot targets must reference existing locations
    if (loc.hotspots) {
      for (const hotspot of loc.hotspots) {
        if (!locationIds.has(hotspot.target)) {
          errors.push({
            path: `/locations/${loc.id}/hotspots`,
            message: `hotspot target "${hotspot.target}" does not match any location id`
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a YAML string. Parses then validates.
 */
export function validateTourYaml(yamlString) {
  let data;
  try {
    data = yaml.load(yamlString);
  } catch (err) {
    return {
      valid: false,
      errors: [{ path: '/', message: `YAML parse error: ${err.message}` }]
    };
  }
  return validateTourData(data);
}

// CLI: validate all YAML files in tours/ when run directly
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const toursDir = join(__dirname, '..', 'tours');
  const files = readdirSync(toursDir).filter(f => f.endsWith('.yaml'));

  if (files.length === 0) {
    console.log('No .yaml files found in tours/');
    process.exit(0);
  }

  let allValid = true;
  for (const file of files) {
    const content = readFileSync(join(toursDir, file), 'utf-8');
    const result = validateTourYaml(content);
    if (result.valid) {
      console.log(`✓ ${file}`);
    } else {
      console.log(`✗ ${file}`);
      for (const err of result.errors) {
        console.log(`    ${err.message}`);
      }
      allValid = false;
    }
  }

  process.exit(allValid ? 0 : 1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd schema && npx vitest run validate.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add schema/validate.js schema/validate.test.js
git commit -m "feat(schema): add YAML tour validator with semantic checks"
```

### Task 3: Update Example Tour YAML

**Files:**
- Modify: `tours/example-campus-tour.yaml`

- [ ] **Step 1: Update the example tour to match the finalized schema**

Update `tours/example-campus-tour.yaml` to include `startLocation`, hotspots, overlays, and use relative media paths (without `360-photos/` prefix — that's the bucket subdirectory, not part of the YAML path):

```yaml
name: SBHS Campus Tour
description: A walking tour of Santa Barbara High School
thumbnail: campus-tour-thumb.jpg
startLocation: main-entrance

locations:
  - id: main-entrance
    name: Main Entrance
    media: main-entrance.jpg
    thumbnail: main-entrance-thumb.jpg
    description: Welcome to Santa Barbara High School!
    hotspots:
      - target: quad
        yaw: 45.0
        pitch: -5.0
        label: To the Quad
    overlays:
      - text: Founded in 1875
        yaw: 180.0
        pitch: 15.0
    connections:
      - quad

  - id: quad
    name: The Quad
    media: quad.jpg
    thumbnail: quad-thumb.jpg
    description: The heart of campus life.
    hotspots:
      - target: main-entrance
        yaw: 180.0
        pitch: 0.0
        label: Back to Entrance
      - target: library
        yaw: 90.0
        pitch: -5.0
        label: To the Library
      - target: gym
        yaw: 270.0
        pitch: -5.0
        label: To the Gym
    connections:
      - main-entrance
      - library
      - gym

  - id: library
    name: Library
    media: library.jpg
    thumbnail: library-thumb.jpg
    description: Our recently renovated library and media center.
    hotspots:
      - target: quad
        yaw: 200.0
        pitch: 0.0
        label: Back to the Quad
    connections:
      - quad

  - id: gym
    name: Gymnasium
    media: gym.jpg
    thumbnail: gym-thumb.jpg
    description: Home of the Dons!
    hotspots:
      - target: quad
        yaw: 30.0
        pitch: 0.0
        label: Back to the Quad
    connections:
      - quad
```

- [ ] **Step 2: Validate the updated YAML**

Run: `cd schema && node validate.js`
Expected: `✓ example-campus-tour.yaml`

- [ ] **Step 3: Commit**

```bash
git add tours/example-campus-tour.yaml
git commit -m "feat(tours): update example tour to match finalized schema"
```

### Task 4: App Scaffolding — Vite + Dependencies

**Files:**
- Create: `app/package.json`
- Create: `app/vite.config.js`
- Create: `app/.env.example`
- Create: `app/public/index.html`

- [ ] **Step 1: Create app/package.json**

```json
{
  "name": "vrtours-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "node ../schema/validate.js && vite build",
    "preview": "vite preview",
    "test:client": "vitest run",
    "test:schema": "node ../schema/validate.js",
    "test": "npm run test:schema && npm run test:client"
  },
  "dependencies": {
    "@babylonjs/core": "^7.0.0",
    "@babylonjs/gui": "^7.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "js-yaml": "^4.1.0"
  }
}
```

Run: `cd app && npm install`

- [ ] **Step 2: Create app/vite.config.js**

The Vite config includes a plugin that copies YAML tour files, converts them to JSON, and bundles them into the output.

```js
import { defineConfig } from 'vite';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Vite plugin: converts tours/*.yaml → JSON and serves/bundles them */
function toursPlugin() {
  const toursDir = join(__dirname, '..', 'tours');

  return {
    name: 'vite-plugin-tours',

    configureServer(server) {
      // Serve tour index (must be before the general /tours handler)
      server.middlewares.use('/tours/index.json', (_req, res) => {
        const files = readdirSync(toursDir).filter(f => f.endsWith('.yaml'));
        const index = files.map(f => f.replace('.yaml', '.json'));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(index));
      });

      // In dev, serve tour JSON on-the-fly from YAML source
      server.middlewares.use('/tours', (req, res, next) => {
        const filename = req.url.replace(/^\//, '').replace(/\.json$/, '.yaml');
        try {
          const yamlContent = readFileSync(join(toursDir, filename), 'utf-8');
          const data = yaml.load(yamlContent);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch {
          next();
        }
      });
    },

    writeBundle(options) {
      // At build time, write tour JSON files into dist/tours/
      const outDir = options.dir || 'dist';
      const toursOutDir = join(outDir, 'tours');
      mkdirSync(toursOutDir, { recursive: true });

      const files = readdirSync(toursDir).filter(f => f.endsWith('.yaml'));
      const index = [];

      for (const file of files) {
        const yamlContent = readFileSync(join(toursDir, file), 'utf-8');
        const data = yaml.load(yamlContent);
        const jsonFilename = file.replace('.yaml', '.json');
        writeFileSync(join(toursOutDir, jsonFilename), JSON.stringify(data));
        index.push(jsonFilename);
      }

      writeFileSync(join(toursOutDir, 'index.json'), JSON.stringify(index));
    }
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [toursPlugin()],
  build: {
    outDir: 'dist'
  }
});
```

- [ ] **Step 3: Create app/.env.example**

```
# Base URL for media assets (360 photos and thumbnails)
# Dev: defaults to local path if not set
# Production: set to R2 bucket URL (e.g., https://media.sbhstours.org)
VITE_MEDIA_BASE_URL=
```

- [ ] **Step 4: Create app/public/index.html**

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
  </style>
</head>
<body>
  <canvas id="app"></canvas>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verify Vite starts**

Run: `cd app && npx vite --host 2>&1 | head -5`
Expected: Vite dev server starts and shows a local URL.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/package-lock.json app/vite.config.js app/.env.example app/public/index.html
git commit -m "feat(app): scaffold Vite project with tours plugin and Babylon.js deps"
```

### Task 5: Config Module

**Files:**
- Create: `app/src/config.js`
- Create: `app/tests/config.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/config.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns default media base URL when env is empty', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', '');
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();
    expect(config.mediaBaseUrl).toBe('/media');
  });

  it('uses VITE_MEDIA_BASE_URL when set', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://media.sbhstours.org');
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();
    expect(config.mediaBaseUrl).toBe('https://media.sbhstours.org');
  });

  it('strips trailing slash from media URL', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://media.sbhstours.org/');
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();
    expect(config.mediaBaseUrl).toBe('https://media.sbhstours.org');
  });

  it('resolves photo URL with resolution suffix', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://media.sbhstours.org');
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();
    expect(config.resolvePhotoUrl('entrance.jpg', '4k'))
      .toBe('https://media.sbhstours.org/360-photos/entrance-4k.jpg');
  });

  it('resolves thumbnail URL', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://media.sbhstours.org');
    const { getConfig } = await import('../src/config.js');
    const config = getConfig();
    expect(config.resolveThumbnailUrl('entrance-thumb.jpg'))
      .toBe('https://media.sbhstours.org/thumbnails/entrance-thumb.jpg');
  });

  it('provides resolution tiers', async () => {
    const { RESOLUTION_TIERS } = await import('../src/config.js');
    expect(RESOLUTION_TIERS).toEqual({
      vr: '8k',
      desktop: '4k',
      mobile: '2k'
    });
  });

  it('detects dev mode from URL param', async () => {
    const { isDevMode } = await import('../src/config.js');
    expect(isDevMode('https://example.com?dev=true')).toBe(true);
    expect(isDevMode('https://example.com')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/config.test.js`
Expected: FAIL — `config.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/config.js`:

```js
export const RESOLUTION_TIERS = {
  vr: '8k',
  desktop: '4k',
  mobile: '2k'
};

/**
 * Build the app config from environment variables.
 * Call once at startup and pass the result to modules that need it.
 */
export function getConfig() {
  const raw = import.meta.env.VITE_MEDIA_BASE_URL || '';
  const mediaBaseUrl = raw ? raw.replace(/\/+$/, '') : '/media';

  return {
    mediaBaseUrl,

    /** Resolve a 360 photo filename to a full URL with resolution suffix.
     *  e.g. ("entrance.jpg", "4k") → "https://…/360-photos/entrance-4k.jpg"
     */
    resolvePhotoUrl(filename, resolution) {
      const base = filename.replace(/\.jpg$/, '');
      return `${mediaBaseUrl}/360-photos/${base}-${resolution}.jpg`;
    },

    /** Resolve a thumbnail filename to a full URL.
     *  e.g. "entrance-thumb.jpg" → "https://…/thumbnails/entrance-thumb.jpg"
     */
    resolveThumbnailUrl(filename) {
      return `${mediaBaseUrl}/thumbnails/${filename}`;
    }
  };
}

/** Check if dev mode is enabled via URL parameter */
export function isDevMode(url) {
  try {
    const params = new URL(url).searchParams;
    return params.get('dev') === 'true';
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/config.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/config.js app/tests/config.test.js
git commit -m "feat(app): add config module with media URL resolution"
```

### Task 6: Math Utilities

**Files:**
- Create: `app/src/math-utils.js`
- Create: `app/tests/math-utils.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/math-utils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { yawPitchToVector3 } from '../src/math-utils.js';

describe('yawPitchToVector3', () => {
  it('converts yaw=0, pitch=0 to forward direction (0, 0, 1)', () => {
    const v = yawPitchToVector3(0, 0, 10);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(10, 5);
  });

  it('converts yaw=90, pitch=0 to right direction (1, 0, 0)', () => {
    // Yaw 90° rotates from +Z toward +X
    const v = yawPitchToVector3(90, 0, 10);
    expect(v.x).toBeCloseTo(10, 4);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 4);
  });

  it('converts yaw=0, pitch=90 to up direction (0, 1, 0)', () => {
    const v = yawPitchToVector3(0, 90, 10);
    expect(v.x).toBeCloseTo(0, 4);
    expect(v.y).toBeCloseTo(10, 4);
    expect(v.z).toBeCloseTo(0, 4);
  });

  it('converts yaw=0, pitch=-90 to down direction (0, -1, 0)', () => {
    const v = yawPitchToVector3(0, -90, 10);
    expect(v.x).toBeCloseTo(0, 4);
    expect(v.y).toBeCloseTo(-10, 4);
    expect(v.z).toBeCloseTo(0, 4);
  });

  it('uses default radius of 10', () => {
    const v = yawPitchToVector3(0, 0);
    expect(v.z).toBeCloseTo(10, 5);
  });

  it('respects custom radius', () => {
    const v = yawPitchToVector3(0, 0, 5);
    expect(v.z).toBeCloseTo(5, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/math-utils.test.js`
Expected: FAIL — `math-utils.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/math-utils.js`:

```js
/**
 * Convert yaw/pitch angles (degrees) to a 3D position vector.
 *
 * Yaw: 0-360°, horizontal rotation. 0° = forward (+Z), 90° = right (+X).
 * Pitch: -90 to +90°, vertical. +90° = up (+Y), -90° = down (-Y).
 * Radius: distance from origin (default 10, inside the PhotoDome).
 *
 * Returns a plain {x, y, z} object (not a Babylon Vector3) so this
 * module stays testable without Babylon.js imports.
 */
export function yawPitchToVector3(yaw, pitch, radius = 10) {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;

  const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
  const y = radius * Math.sin(pitchRad);
  const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);

  return { x, y, z };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/math-utils.test.js`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/math-utils.js app/tests/math-utils.test.js
git commit -m "feat(app): add yaw/pitch to Vector3 math utilities"
```

### Task 7: Tour Loader Module

**Files:**
- Create: `app/src/tour-loader.js`
- Create: `app/tests/tour-loader.test.js`
- Create: `app/tests/fixtures/valid-tour.json`
- Create: `app/tests/fixtures/invalid-tour-missing-start.json`
- Create: `app/tests/fixtures/invalid-tour-bad-connection.json`

- [ ] **Step 1: Create test fixtures**

Create `app/tests/fixtures/valid-tour.json`:

```json
{
  "name": "Test Tour",
  "description": "A test tour",
  "thumbnail": "test-tour-thumb.jpg",
  "startLocation": "entrance",
  "locations": [
    {
      "id": "entrance",
      "name": "Entrance",
      "media": "entrance.jpg",
      "thumbnail": "entrance-thumb.jpg",
      "description": "The entrance",
      "connections": ["lobby"],
      "hotspots": [
        { "target": "lobby", "yaw": 90, "pitch": 0, "label": "To Lobby" }
      ],
      "overlays": [
        { "text": "Welcome!", "yaw": 180, "pitch": 10 }
      ]
    },
    {
      "id": "lobby",
      "name": "Lobby",
      "media": "lobby.jpg",
      "description": "The lobby area",
      "connections": ["entrance"]
    }
  ]
}
```

Create `app/tests/fixtures/invalid-tour-missing-start.json`:

```json
{
  "name": "Bad Tour",
  "description": "Missing start",
  "thumbnail": "bad-tour-thumb.jpg",
  "startLocation": "nonexistent",
  "locations": [
    { "id": "entrance", "name": "Entrance", "media": "entrance.jpg", "connections": [] }
  ]
}
```

Create `app/tests/fixtures/invalid-tour-bad-connection.json`:

```json
{
  "name": "Bad Tour",
  "description": "Bad connection",
  "thumbnail": "bad-tour-thumb.jpg",
  "startLocation": "entrance",
  "locations": [
    { "id": "entrance", "name": "Entrance", "media": "entrance.jpg", "connections": ["ghost"] }
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `app/tests/tour-loader.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { TourLoader } from '../src/tour-loader.js';
import validTour from './fixtures/valid-tour.json';
import missingStart from './fixtures/invalid-tour-missing-start.json';
import badConnection from './fixtures/invalid-tour-bad-connection.json';

describe('TourLoader', () => {
  describe('loadTour', () => {
    it('loads and indexes a valid tour', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);

      expect(loader.tourName).toBe('Test Tour');
      expect(loader.startLocationId).toBe('entrance');
      expect(loader.locationIds).toEqual(['entrance', 'lobby']);
    });

    it('throws on missing startLocation reference', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      expect(() => loader.loadTour(missingStart)).toThrow('startLocation');
    });

    it('throws on invalid connection reference', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      expect(() => loader.loadTour(badConnection)).toThrow('ghost');
    });
  });

  describe('getLocation', () => {
    it('returns location data by id', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);

      const loc = loader.getLocation('entrance');
      expect(loc.name).toBe('Entrance');
      expect(loc.connections).toEqual(['lobby']);
    });

    it('returns null for unknown id', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);

      expect(loader.getLocation('nonexistent')).toBeNull();
    });
  });

  describe('resolvePhotoUrl', () => {
    it('resolves media filename to full URL with resolution', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);

      expect(loader.resolvePhotoUrl('entrance.jpg', '4k'))
        .toBe('https://cdn.test/360-photos/entrance-4k.jpg');
    });
  });

  describe('resolveThumbnailUrl', () => {
    it('resolves thumbnail filename to full URL', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);

      expect(loader.resolveThumbnailUrl('entrance-thumb.jpg'))
        .toBe('https://cdn.test/thumbnails/entrance-thumb.jpg');
    });
  });

  describe('getAllLocations', () => {
    it('returns all locations in order', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);

      const all = loader.getAllLocations();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('entrance');
      expect(all[1].id).toBe('lobby');
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd app && npx vitest run tests/tour-loader.test.js`
Expected: FAIL — `tour-loader.js` doesn't exist.

- [ ] **Step 4: Write the implementation**

Create `app/src/tour-loader.js`:

```js
/**
 * TourLoader — parses tour JSON data, builds a location index,
 * and resolves media URLs. No Babylon.js dependency.
 */
export class TourLoader {
  /** @param {{ mediaBaseUrl: string }} config */
  constructor(config) {
    this._mediaBaseUrl = config.mediaBaseUrl;
    this._tour = null;
    this._locationMap = new Map();
  }

  /** Load and validate tour data (already parsed from JSON). */
  loadTour(data) {
    this._locationMap.clear();

    // Index locations by id
    for (const loc of data.locations) {
      this._locationMap.set(loc.id, loc);
    }

    // Validate startLocation
    if (!this._locationMap.has(data.startLocation)) {
      throw new Error(
        `startLocation "${data.startLocation}" does not match any location id`
      );
    }

    // Validate connections and hotspot targets
    for (const loc of data.locations) {
      for (const conn of loc.connections) {
        if (!this._locationMap.has(conn)) {
          throw new Error(
            `Location "${loc.id}" has connection to unknown location "${conn}"`
          );
        }
      }
      if (loc.hotspots) {
        for (const hs of loc.hotspots) {
          if (!this._locationMap.has(hs.target)) {
            throw new Error(
              `Location "${loc.id}" has hotspot targeting unknown location "${hs.target}"`
            );
          }
        }
      }
    }

    this._tour = data;
  }

  get tourName() {
    return this._tour?.name ?? null;
  }

  get startLocationId() {
    return this._tour?.startLocation ?? null;
  }

  get locationIds() {
    return this._tour ? this._tour.locations.map(l => l.id) : [];
  }

  /** Get a location by id, or null if not found. */
  getLocation(id) {
    return this._locationMap.get(id) ?? null;
  }

  /** Get all locations in tour order. */
  getAllLocations() {
    return this._tour ? [...this._tour.locations] : [];
  }

  /** Resolve a media filename + resolution tier to a full photo URL. */
  resolvePhotoUrl(filename, resolution) {
    const base = filename.replace(/\.jpg$/, '');
    return `${this._mediaBaseUrl}/360-photos/${base}-${resolution}.jpg`;
  }

  /** Resolve a thumbnail filename to a full URL. */
  resolveThumbnailUrl(filename) {
    return `${this._mediaBaseUrl}/thumbnails/${filename}`;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/tour-loader.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/tour-loader.js app/tests/tour-loader.test.js app/tests/fixtures/
git commit -m "feat(app): add TourLoader with validation and URL resolution"
```

---

## Chunk 2: Babylon.js Client Modules

This chunk builds all six Babylon.js-dependent modules: Scene Manager, Platform Adapter, Hotspot System, Overlay System, Location Picker, and the main entry point. These modules depend on the Tour Loader and Config from Chunk 1.

### Task 8: Scene Manager

**Files:**
- Create: `app/src/scene-manager.js`
- Create: `app/tests/scene-manager.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/scene-manager.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneManager } from '../src/scene-manager.js';

// Minimal Babylon.js mocks
function createMockScene() {
  return {
    onBeforeRenderObservable: { add: vi.fn() },
    removeMesh: vi.fn()
  };
}

function createMockEngine() {
  return {
    runRenderLoop: vi.fn(),
    resize: vi.fn()
  };
}

describe('SceneManager', () => {
  let mockScene, mockEngine;

  beforeEach(() => {
    mockScene = createMockScene();
    mockEngine = createMockEngine();
  });

  it('stores the current location id after transition', async () => {
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome: vi.fn().mockResolvedValue({ dispose: vi.fn() }),
      animateFade: vi.fn().mockResolvedValue(undefined)
    });

    await manager.transitionTo('entrance', 'https://cdn.test/360-photos/entrance-4k.jpg');
    expect(manager.currentLocationId).toBe('entrance');
  });

  it('calls createPhotoDome with the media URL', async () => {
    const createPhotoDome = vi.fn().mockResolvedValue({ dispose: vi.fn() });
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome,
      animateFade: vi.fn().mockResolvedValue(undefined)
    });

    await manager.transitionTo('entrance', 'https://cdn.test/360-photos/entrance-4k.jpg');
    expect(createPhotoDome).toHaveBeenCalledWith(
      mockScene,
      'https://cdn.test/360-photos/entrance-4k.jpg'
    );
  });

  it('disposes previous PhotoDome on transition', async () => {
    const disposeFn = vi.fn();
    const createPhotoDome = vi.fn().mockResolvedValue({ dispose: disposeFn });
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome,
      animateFade: vi.fn().mockResolvedValue(undefined)
    });

    await manager.transitionTo('entrance', 'https://cdn.test/entrance-4k.jpg');
    await manager.transitionTo('lobby', 'https://cdn.test/lobby-4k.jpg');

    expect(disposeFn).toHaveBeenCalledTimes(1);
  });

  it('fires onTransition callback', async () => {
    const onTransition = vi.fn();
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome: vi.fn().mockResolvedValue({ dispose: vi.fn() }),
      animateFade: vi.fn().mockResolvedValue(undefined)
    });
    manager.onTransition = onTransition;

    await manager.transitionTo('entrance', 'https://cdn.test/entrance-4k.jpg');
    expect(onTransition).toHaveBeenCalledWith('entrance');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/scene-manager.test.js`
Expected: FAIL — `scene-manager.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/scene-manager.js`:

```js
/**
 * SceneManager — owns the PhotoDome lifecycle and scene transitions.
 *
 * Accepts dependency-injected helpers (createPhotoDome, animateFade)
 * so the core logic is testable without a real WebGL context.
 */
export class SceneManager {
  /**
   * @param {object} scene - Babylon.js Scene
   * @param {object} engine - Babylon.js Engine
   * @param {{ createPhotoDome, animateFade }} helpers - DI'd Babylon wrappers
   */
  constructor(scene, engine, helpers) {
    this._scene = scene;
    this._engine = engine;
    this._createPhotoDome = helpers.createPhotoDome;
    this._animateFade = helpers.animateFade;
    this._currentDome = null;
    this._currentLocationId = null;
    this._transitioning = false;

    /** Set this to a function to be notified after each transition. */
    this.onTransition = null;
  }

  get currentLocationId() {
    return this._currentLocationId;
  }

  /**
   * Transition to a new location.
   * Fades out → swaps PhotoDome → fades in.
   */
  async transitionTo(locationId, mediaUrl) {
    if (this._transitioning) return;
    this._transitioning = true;

    try {
      // Fade out (skip on first load)
      if (this._currentDome) {
        await this._animateFade(this._scene, 'out');
        this._currentDome.dispose();
      }

      // Create new PhotoDome
      this._currentDome = await this._createPhotoDome(this._scene, mediaUrl);
      this._currentLocationId = locationId;

      // Fade in
      await this._animateFade(this._scene, 'in');

      if (this.onTransition) {
        this.onTransition(locationId);
      }
    } finally {
      this._transitioning = false;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/scene-manager.test.js`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/scene-manager.js app/tests/scene-manager.test.js
git commit -m "feat(app): add SceneManager with fade transitions"
```

### Task 9: Platform Adapter

**Files:**
- Create: `app/src/platform-adapter.js`
- Create: `app/tests/platform-adapter.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/platform-adapter.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { detectPlatform, getResolutionTier, enableDevCoordinates } from '../src/platform-adapter.js';

describe('detectPlatform', () => {
  it('returns "desktop" for standard navigator', () => {
    const nav = { xr: undefined, userAgent: 'Mozilla/5.0 (Macintosh)' };
    expect(detectPlatform(nav)).toBe('desktop');
  });

  it('returns "mobile" for mobile user agent', () => {
    const nav = {
      xr: undefined,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)'
    };
    expect(detectPlatform(nav)).toBe('mobile');
  });

  it('returns "mobile" for Android user agent', () => {
    const nav = {
      xr: undefined,
      userAgent: 'Mozilla/5.0 (Linux; Android 13)'
    };
    expect(detectPlatform(nav)).toBe('mobile');
  });
});

describe('getResolutionTier', () => {
  it('returns "4k" for desktop', () => {
    expect(getResolutionTier('desktop')).toBe('4k');
  });

  it('returns "2k" for mobile', () => {
    expect(getResolutionTier('mobile')).toBe('2k');
  });

  it('returns "8k" for vr', () => {
    expect(getResolutionTier('vr')).toBe('8k');
  });
});

describe('enableDevCoordinates', () => {
  it('sets onPointerDown handler on the scene', () => {
    const mockScene = { onPointerDown: null };
    enableDevCoordinates(mockScene);
    expect(typeof mockScene.onPointerDown).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/platform-adapter.test.js`
Expected: FAIL — `platform-adapter.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/platform-adapter.js`:

```js
import { RESOLUTION_TIERS } from './config.js';

/**
 * Detect the platform from the navigator object.
 * VR detection happens asynchronously after this — call checkVRSupport()
 * separately and upgrade the platform if supported.
 *
 * @param {object} nav - navigator-like object (for testability)
 * @returns {'desktop' | 'mobile'}
 */
export function detectPlatform(nav) {
  const ua = nav.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/** Get the resolution tier string for a platform. */
export function getResolutionTier(platform) {
  return RESOLUTION_TIERS[platform] || '4k';
}

/**
 * Check if WebXR immersive-vr is supported.
 * @returns {Promise<boolean>}
 */
export async function checkVRSupport() {
  if (typeof navigator === 'undefined' || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}

/**
 * Set up input handling for the given platform on a Babylon.js scene.
 * This is the Babylon-dependent part — called from main.js at startup.
 *
 * @param {object} scene - Babylon.js Scene
 * @param {object} camera - Babylon.js ArcRotateCamera or similar
 * @param {'desktop' | 'mobile' | 'vr'} platform
 */
export function setupInput(scene, camera, platform) {
  const canvas = scene.getEngine().getRenderingCanvas();
  camera.attachControl(canvas, true);
  // Disable zoom — not useful inside a photosphere
  camera.inputs.attached.mousewheel?.detachControl();

  if (platform === 'mobile') {
    // Enable device orientation (gyroscope) if available
    camera.inputs.addDeviceOrientationInput?.();
  }
  // VR input handled by WebXRDefaultExperience — controller ray + trigger
  // works through Babylon's pointer event emulation (scene.onPointerDown)
}

/**
 * Dev mode: log yaw/pitch coordinates on click for the Tour Design team.
 * Enabled via ?dev=true URL parameter. Call from main.js after scene setup.
 *
 * @param {object} scene - Babylon.js Scene
 */
export function enableDevCoordinates(scene) {
  scene.onPointerDown = (_evt, pickResult) => {
    if (!pickResult.hit || !pickResult.pickedPoint) return;
    const pos = pickResult.pickedPoint;
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const yaw = ((Math.atan2(pos.x, pos.z) * 180) / Math.PI + 360) % 360;
    const pitch = (Math.asin(pos.y / r) * 180) / Math.PI;
    console.log(`[dev] yaw: ${yaw.toFixed(1)}, pitch: ${pitch.toFixed(1)}`);
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/platform-adapter.test.js`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/platform-adapter.js app/tests/platform-adapter.test.js
git commit -m "feat(app): add PlatformAdapter with detection and resolution tiers"
```

### Task 10: Hotspot System

**Files:**
- Create: `app/src/hotspot-system.js`
- Create: `app/tests/hotspot-system.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/hotspot-system.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { HotspotSystem } from '../src/hotspot-system.js';
import { yawPitchToVector3 } from '../src/math-utils.js';

describe('HotspotSystem', () => {
  it('creates hotspot data from location hotspots', () => {
    const system = new HotspotSystem({ radius: 10 });
    const hotspots = [
      { target: 'lobby', yaw: 90, pitch: 0, label: 'To Lobby' },
      { target: 'gym', yaw: 270, pitch: -5 }
    ];

    const result = system.createHotspotData(hotspots);

    expect(result).toHaveLength(2);
    expect(result[0].target).toBe('lobby');
    expect(result[0].label).toBe('To Lobby');
    expect(result[0].position.x).toBeCloseTo(10, 4);
    expect(result[1].target).toBe('gym');
    expect(result[1].label).toBe('gym'); // fallback to target id
  });

  it('returns empty array for undefined hotspots', () => {
    const system = new HotspotSystem({ radius: 10 });
    expect(system.createHotspotData(undefined)).toEqual([]);
    expect(system.createHotspotData([])).toEqual([]);
  });

  it('uses math-utils for position calculation', () => {
    const system = new HotspotSystem({ radius: 5 });
    const hotspots = [{ target: 'test', yaw: 45, pitch: 30 }];
    const result = system.createHotspotData(hotspots);

    const expected = yawPitchToVector3(45, 30, 5);
    expect(result[0].position.x).toBeCloseTo(expected.x, 5);
    expect(result[0].position.y).toBeCloseTo(expected.y, 5);
    expect(result[0].position.z).toBeCloseTo(expected.z, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/hotspot-system.test.js`
Expected: FAIL — `hotspot-system.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/hotspot-system.js`:

```js
import { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';
import { yawPitchToVector3 } from './math-utils.js';

/**
 * HotspotSystem — computes hotspot placement data from YAML definitions,
 * and manages 3D hotspot meshes in the Babylon.js scene.
 *
 * The data computation (createHotspotData) is pure and testable.
 * The Babylon mesh management (placeHotspots, clearHotspots) requires a scene.
 */
export class HotspotSystem {
  constructor({ radius = 10 } = {}) {
    this._radius = radius;
    this._meshes = [];
    this._onSelect = null;
  }

  /** Set callback for when a hotspot is selected. */
  set onSelect(fn) {
    this._onSelect = fn;
  }

  /**
   * Compute hotspot positions from YAML hotspot data.
   * Returns an array of { target, label, position: {x,y,z} }.
   * Pure function — no Babylon dependency.
   */
  createHotspotData(hotspots) {
    if (!hotspots || hotspots.length === 0) return [];

    return hotspots.map(hs => ({
      target: hs.target,
      label: hs.label || hs.target,
      position: yawPitchToVector3(hs.yaw, hs.pitch, this._radius)
    }));
  }

  /**
   * Place 3D hotspot billboard sprites in the scene.
   * Call clearHotspots() first when switching locations.
   *
   * Each hotspot is a plane with billboard mode (always faces camera),
   * an arrow-like emissive material, and metadata for click detection.
   *
   * @param {object} scene - Babylon.js Scene
   * @param {Array} hotspotData - output from createHotspotData()
   */
  placeHotspots(scene, hotspotData) {
    for (const hs of hotspotData) {
      const mesh = MeshBuilder.CreatePlane(
        `hotspot-${hs.target}`,
        { width: 0.6, height: 0.6 },
        scene
      );
      mesh.position = new Vector3(hs.position.x, hs.position.y, hs.position.z);
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.metadata = { target: hs.target, label: hs.label };

      const mat = new StandardMaterial(`hotspot-mat-${hs.target}`, scene);
      mat.emissiveColor = new Color3(0.2, 0.6, 1);
      mat.alpha = 0.8;
      mat.disableLighting = true;
      mesh.material = mat;

      mesh.isPickable = true;
      this._meshes.push(mesh);
    }
  }

  /** Remove all hotspot meshes from the scene. */
  clearHotspots() {
    for (const mesh of this._meshes) {
      mesh.dispose();
    }
    this._meshes = [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/hotspot-system.test.js`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/hotspot-system.js app/tests/hotspot-system.test.js
git commit -m "feat(app): add HotspotSystem with yaw/pitch positioning"
```

### Task 11: Overlay System

**Files:**
- Create: `app/src/overlay-system.js`
- Create: `app/tests/overlay-system.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/overlay-system.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { OverlaySystem } from '../src/overlay-system.js';
import { yawPitchToVector3 } from '../src/math-utils.js';

describe('OverlaySystem', () => {
  it('creates overlay data from location overlays', () => {
    const system = new OverlaySystem({ radius: 10 });
    const overlays = [
      { text: 'Founded in 1875', yaw: 180, pitch: 15 }
    ];

    const result = system.createOverlayData(overlays);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Founded in 1875');

    const expected = yawPitchToVector3(180, 15, 10);
    expect(result[0].position.x).toBeCloseTo(expected.x, 5);
    expect(result[0].position.y).toBeCloseTo(expected.y, 5);
    expect(result[0].position.z).toBeCloseTo(expected.z, 5);
  });

  it('returns empty array for undefined overlays', () => {
    const system = new OverlaySystem({ radius: 10 });
    expect(system.createOverlayData(undefined)).toEqual([]);
    expect(system.createOverlayData([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/overlay-system.test.js`
Expected: FAIL — `overlay-system.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/overlay-system.js`:

```js
import { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import { yawPitchToVector3 } from './math-utils.js';

/**
 * OverlaySystem — computes overlay placement data and manages
 * semi-transparent text cards in the Babylon.js scene.
 *
 * Like HotspotSystem, data computation is pure; mesh management needs Babylon.
 */
export class OverlaySystem {
  constructor({ radius = 10 } = {}) {
    this._radius = radius;
    this._meshes = [];
  }

  /**
   * Compute overlay positions from YAML overlay data.
   * Returns an array of { text, position: {x,y,z} }.
   */
  createOverlayData(overlays) {
    if (!overlays || overlays.length === 0) return [];

    return overlays.map(ov => ({
      text: ov.text,
      position: yawPitchToVector3(ov.yaw, ov.pitch, this._radius)
    }));
  }

  /**
   * Place text overlay meshes in the scene.
   * Call clearOverlays() first when switching locations.
   *
   * Each overlay is a billboard plane with a GUI TextBlock.
   *
   * @param {object} scene - Babylon.js Scene
   * @param {Array} overlayData - output from createOverlayData()
   */
  placeOverlays(scene, overlayData) {
    for (let i = 0; i < overlayData.length; i++) {
      const ov = overlayData[i];

      const plane = MeshBuilder.CreatePlane(
        `overlay-${i}`,
        { width: 2, height: 0.8 },
        scene
      );
      plane.position = new Vector3(ov.position.x, ov.position.y, ov.position.z);
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

      const mat = new StandardMaterial(`overlay-mat-${i}`, scene);
      mat.emissiveColor = new Color3(0, 0, 0);
      mat.alpha = 0.7;
      mat.disableLighting = true;
      plane.material = mat;

      const texture = AdvancedDynamicTexture.CreateForMesh(plane);
      const textBlock = new TextBlock();
      textBlock.text = ov.text;
      textBlock.color = 'white';
      textBlock.fontSize = 48;
      textBlock.textWrapping = true;
      texture.addControl(textBlock);

      plane.isPickable = false;
      this._meshes.push(plane);
    }
  }

  /** Remove all overlay meshes from the scene. */
  clearOverlays() {
    for (const mesh of this._meshes) {
      mesh.dispose();
    }
    this._meshes = [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/overlay-system.test.js`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/overlay-system.js app/tests/overlay-system.test.js
git commit -m "feat(app): add OverlaySystem with text card placement"
```

### Task 12: Location Picker Menu

**Files:**
- Create: `app/src/location-picker.js`
- Create: `app/tests/location-picker.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/tests/location-picker.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { LocationPicker } from '../src/location-picker.js';

const LOCATIONS = [
  { id: 'entrance', name: 'Entrance', thumbnail: 'entrance-thumb.jpg' },
  { id: 'lobby', name: 'Lobby' },
  { id: 'gym', name: 'Gymnasium', thumbnail: 'gym-thumb.jpg' }
];

describe('LocationPicker', () => {
  it('stores location list for display', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');

    expect(picker.items).toHaveLength(3);
    expect(picker.items[0].id).toBe('entrance');
    expect(picker.items[0].name).toBe('Entrance');
  });

  it('resolves thumbnail URLs', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');

    expect(picker.items[0].thumbnailUrl).toBe('https://cdn.test/thumbnails/entrance-thumb.jpg');
    expect(picker.items[1].thumbnailUrl).toBeNull(); // no thumbnail defined
  });

  it('tracks current location', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');
    picker.setCurrentLocation('lobby');

    expect(picker.currentLocationId).toBe('lobby');
  });

  it('filters out current location from selectable items', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');
    picker.setCurrentLocation('lobby');

    const selectable = picker.getSelectableItems();
    expect(selectable).toHaveLength(2);
    expect(selectable.find(i => i.id === 'lobby')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/location-picker.test.js`
Expected: FAIL — `location-picker.js` doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `app/src/location-picker.js`:

```js
import {
  StackPanel, Button, Control, Rectangle, ScrollViewer
} from '@babylonjs/gui';

/**
 * LocationPicker — manages the data model for the location picker menu.
 * The Babylon.js GUI rendering is handled separately in buildPickerUI().
 *
 * Data layer is pure and testable; GUI layer requires Babylon.
 */
export class LocationPicker {
  constructor() {
    this._items = [];
    this._currentLocationId = null;
    this._onSelect = null;
    this._guiPanel = null;
  }

  /** Set callback for when a location is selected from the picker. */
  set onSelect(fn) {
    this._onSelect = fn;
  }

  get items() {
    return this._items;
  }

  get currentLocationId() {
    return this._currentLocationId;
  }

  /**
   * Set the list of all locations for display.
   * @param {Array<{id, name, thumbnail?}>} locations
   * @param {string} mediaBaseUrl
   */
  setLocations(locations, mediaBaseUrl) {
    this._items = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      thumbnailUrl: loc.thumbnail
        ? `${mediaBaseUrl}/thumbnails/${loc.thumbnail}`
        : null
    }));
  }

  /** Update which location is currently active. */
  setCurrentLocation(locationId) {
    this._currentLocationId = locationId;
  }

  /** Get items excluding the current location (for the menu). */
  getSelectableItems() {
    return this._items.filter(item => item.id !== this._currentLocationId);
  }

  /**
   * Build the Babylon.js GUI panel for the picker.
   * Called once at startup, updated on location change.
   *
   * @param {object} advancedTexture - Babylon.js AdvancedDynamicTexture (fullscreen)
   */
  buildPickerUI(advancedTexture) {
    const container = new Rectangle('picker-container');
    container.width = '300px';
    container.height = '100%';
    container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.background = 'rgba(0, 0, 0, 0.8)';
    container.isVisible = false;
    advancedTexture.addControl(container);

    const scrollViewer = new ScrollViewer('picker-scroll');
    scrollViewer.width = '100%';
    scrollViewer.height = '100%';
    container.addControl(scrollViewer);

    const panel = new StackPanel('picker-panel');
    panel.width = '100%';
    scrollViewer.addControl(panel);

    this._guiPanel = container;
    this._stackPanel = panel;

    return container;
  }

  /** Toggle picker visibility. */
  toggle() {
    if (this._guiPanel) {
      this._guiPanel.isVisible = !this._guiPanel.isVisible;
    }
  }

  /** Update the picker UI with current selectable items. */
  updateUI() {
    if (!this._stackPanel) return;

    this._stackPanel.clearControls();

    for (const item of this.getSelectableItems()) {
      const btn = Button.CreateSimpleButton(`pick-${item.id}`, item.name);
      btn.width = '280px';
      btn.height = '50px';
      btn.color = 'white';
      btn.background = 'rgba(50, 50, 80, 0.9)';
      btn.onPointerClickObservable.add(() => {
        if (this._onSelect) this._onSelect(item.id);
      });
      this._stackPanel.addControl(btn);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/location-picker.test.js`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/location-picker.js app/tests/location-picker.test.js
git commit -m "feat(app): add LocationPicker data model and UI skeleton"
```

### Task 13: Main Entry Point

**Files:**
- Create: `app/src/main.js`

This wires all modules together. No unit test for main.js — it's integration glue. Testing coverage comes from the module-level tests above.

- [ ] **Step 1: Write the main entry point**

Create `app/src/main.js`:

```js
import {
  Engine, Scene, ArcRotateCamera, Vector3, PhotoDome,
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

/** Create a fullscreen black plane used for fade transitions. */
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
  plane.renderingGroupId = 1; // render on top
  return { plane, mat };
}

/** Animate the fade overlay alpha over duration ms. */
function animateAlpha(mat, from, to, duration) {
  return new Promise(resolve => {
    const start = performance.now();
    function step() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      mat.alpha = from + (to - from) * t;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

async function main() {
  const config = getConfig();
  const devMode = isDevMode(window.location.href);

  // Detect platform
  let platform = detectPlatform(navigator);
  const vrSupported = await checkVRSupport();
  if (vrSupported) platform = 'vr';
  const resolution = getResolutionTier(platform);

  // Set up Babylon engine and scene
  const canvas = document.getElementById('app');
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // Camera (used for non-VR; VR overrides this)
  const camera = new ArcRotateCamera('camera', 0, Math.PI / 2, 0.1, Vector3.Zero(), scene);
  setupInput(scene, camera, platform);

  // Fade overlay for transitions
  const fade = createFadeOverlay(scene);

  // Babylon helper functions (injected into SceneManager for testability)
  async function createPhotoDome(_scene, url) {
    return new PhotoDome('photodome', url, { resolution: 32, size: 1000 }, _scene);
  }

  async function animateFade(_scene, direction) {
    if (direction === 'out') {
      await animateAlpha(fade.mat, 0, 1, 300);
    } else {
      await animateAlpha(fade.mat, 1, 0, 300);
    }
  }

  // Initialize modules
  const tourLoader = new TourLoader(config);
  const sceneManager = new SceneManager(scene, engine, { createPhotoDome, animateFade });
  const hotspotSystem = new HotspotSystem({ radius: 8 });
  const overlaySystem = new OverlaySystem({ radius: 9 });
  const locationPicker = new LocationPicker();

  // Load tour data
  const tourIndex = await fetch('/tours/index.json').then(r => r.json());
  if (tourIndex.length === 0) {
    console.error('No tours found');
    return;
  }

  // Load the first tour (future: tour selection screen)
  const tourData = await fetch(`/tours/${tourIndex[0]}`).then(r => r.json());
  tourLoader.loadTour(tourData);

  // Set up location picker
  const fullscreenUI = AdvancedDynamicTexture.CreateFullscreenUI('ui');
  locationPicker.setLocations(tourLoader.getAllLocations(), config.mediaBaseUrl);
  locationPicker.buildPickerUI(fullscreenUI);

  // Menu toggle button
  const menuBtn = Button.CreateSimpleButton('menu-btn', '\u2630');
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

  // Navigation handler — shared by hotspots and picker
  async function navigateTo(locationId) {
    const location = tourLoader.getLocation(locationId);
    if (!location) return;

    const mediaUrl = tourLoader.resolvePhotoUrl(location.media, resolution);

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

  // Wire up hotspot selection
  hotspotSystem.onSelect = navigateTo;
  locationPicker.onSelect = (id) => {
    locationPicker.toggle();
    navigateTo(id);
  };

  // Hotspot click detection via scene pointer
  scene.onPointerDown = (_evt, pickResult) => {
    if (pickResult.hit && pickResult.pickedMesh?.metadata?.target) {
      navigateTo(pickResult.pickedMesh.metadata.target);
    }
  };

  // Dev mode: show yaw/pitch coordinates on click (for Tour Design team)
  if (devMode) {
    enableDevCoordinates(scene);
  }

  // Enable WebXR if supported
  if (vrSupported) {
    await scene.createDefaultXRExperienceAsync({
      floorMeshes: []
    });
  }

  // Navigate to start location
  await navigateTo(tourLoader.startLocationId);

  // Render loop
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
```

- [ ] **Step 2: Verify dev server loads without errors**

Run: `cd app && npx vite --host 2>&1 | head -5`
Open in browser. Expected: Canvas loads (may show errors without media files — that's OK for now).

- [ ] **Step 3: Commit**

```bash
git add app/src/main.js
git commit -m "feat(app): add main entry point wiring all modules together"
```

---

## Chunk 3: Media Pipeline and Integration

This chunk builds the media processing pipeline, wires up the top-level npm scripts, and does a final integration pass.

### Task 14: Media Build Script

**Files:**
- Create: `media/scripts/package.json`
- Create: `media/scripts/build.js`
- Create: `media/scripts/build.test.js`

- [ ] **Step 1: Create media/scripts/package.json**

```json
{
  "name": "vrtours-media-scripts",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "sharp": "^0.33.0",
    "@aws-sdk/client-s3": "^3.700.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  },
  "scripts": {
    "build": "node build.js",
    "sync": "node sync.js",
    "test": "vitest run"
  }
}
```

Run: `cd media/scripts && npm install`

- [ ] **Step 2: Write the failing test**

Create `media/scripts/build.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateImage, getOutputFilenames } from './build.js';

describe('validateImage', () => {
  it('accepts a valid equirectangular image metadata', () => {
    const meta = { width: 8192, height: 4096, format: 'jpeg' };
    const result = validateImage('test.jpg', meta);
    expect(result.valid).toBe(true);
  });

  it('rejects non-2:1 aspect ratio', () => {
    const meta = { width: 4000, height: 3000, format: 'jpeg' };
    const result = validateImage('test.jpg', meta);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('aspect ratio');
  });

  it('rejects image below minimum resolution', () => {
    const meta = { width: 1024, height: 512, format: 'jpeg' };
    const result = validateImage('test.jpg', meta);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('resolution');
  });

  it('rejects non-JPEG format', () => {
    const meta = { width: 8192, height: 4096, format: 'png' };
    const result = validateImage('test.png', meta);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JPEG');
  });
});

describe('getOutputFilenames', () => {
  it('generates resolution variants and thumbnail', () => {
    const result = getOutputFilenames('main-entrance.jpg');
    expect(result).toEqual({
      '8k': 'main-entrance-8k.jpg',
      '4k': 'main-entrance-4k.jpg',
      '2k': 'main-entrance-2k.jpg',
      thumb: 'main-entrance-thumb.jpg'
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd media/scripts && npx vitest run build.test.js`
Expected: FAIL — exports don't exist yet.

- [ ] **Step 4: Write the implementation**

Create `media/scripts/build.js`:

```js
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MEDIA_ROOT = resolve(__dirname, '..');
const ORIGINALS_DIR = join(MEDIA_ROOT, 'originals');
const PHOTOS_DIR = join(MEDIA_ROOT, '360-photos');
const THUMBS_DIR = join(MEDIA_ROOT, 'thumbnails');
const MANIFEST_PATH = join(MEDIA_ROOT, 'manifest.json');

const RESOLUTIONS = {
  '8k': { width: 8192, height: 4096 },
  '4k': { width: 4096, height: 2048 },
  '2k': { width: 2048, height: 1024 }
};

const THUMB_SIZE = { width: 400, height: 300 };
const MIN_WIDTH = 2048;

/**
 * Validate image metadata for equirectangular requirements.
 * Exported for testing.
 */
export function validateImage(filename, meta) {
  if (meta.format !== 'jpeg') {
    return { valid: false, error: `${filename}: must be JPEG format, got ${meta.format}` };
  }

  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - 2.0) > 0.05) {
    return { valid: false, error: `${filename}: expected 2:1 aspect ratio for equirectangular, got ${ratio.toFixed(2)}:1` };
  }

  if (meta.width < MIN_WIDTH) {
    return { valid: false, error: `${filename}: minimum resolution is ${MIN_WIDTH}px wide, got ${meta.width}px` };
  }

  return { valid: true };
}

/**
 * Get output filenames for all resolution variants + thumbnail.
 * Exported for testing.
 */
export function getOutputFilenames(originalFilename) {
  const base = originalFilename.replace(/\.jpg$/i, '');
  return {
    '8k': `${base}-8k.jpg`,
    '4k': `${base}-4k.jpg`,
    '2k': `${base}-2k.jpg`,
    thumb: `${base}-thumb.jpg`
  };
}

/** Process a single original image into all variants. */
async function processImage(filename) {
  const inputPath = join(ORIGINALS_DIR, filename);
  const meta = await sharp(inputPath).metadata();
  const validation = validateImage(filename, meta);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const outputs = getOutputFilenames(filename);
  const manifest = [];

  // Generate resolution variants
  for (const [tier, dims] of Object.entries(RESOLUTIONS)) {
    // Only generate if original is large enough
    if (meta.width >= dims.width) {
      const outputPath = join(PHOTOS_DIR, outputs[tier]);
      await sharp(inputPath)
        .resize(dims.width, dims.height, { fit: 'fill' })
        .jpeg({ quality: 85 })
        .toFile(outputPath);

      manifest.push({
        file: `360-photos/${outputs[tier]}`,
        width: dims.width,
        height: dims.height,
        tier
      });
    }
  }

  // Generate thumbnail
  const thumbPath = join(THUMBS_DIR, outputs.thumb);
  await sharp(inputPath)
    .resize(THUMB_SIZE.width, THUMB_SIZE.height, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  manifest.push({
    file: `thumbnails/${outputs.thumb}`,
    width: THUMB_SIZE.width,
    height: THUMB_SIZE.height,
    tier: 'thumb'
  });

  return manifest;
}

// CLI entry point
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    await mkdir(PHOTOS_DIR, { recursive: true });
    await mkdir(THUMBS_DIR, { recursive: true });

    let files;
    try {
      files = (await readdir(ORIGINALS_DIR)).filter(f => /\.jpe?g$/i.test(f));
    } catch {
      console.log('No media/originals/ directory found. Nothing to process.');
      process.exit(0);
    }

    if (files.length === 0) {
      console.log('No JPEG files found in media/originals/. Nothing to process.');
      process.exit(0);
    }

    const fullManifest = [];

    for (const file of files) {
      console.log(`Processing ${file}...`);
      const entries = await processImage(file);
      fullManifest.push(...entries);
      console.log(`  ✓ Generated ${entries.length} files`);
    }

    await writeFile(MANIFEST_PATH, JSON.stringify(fullManifest, null, 2));
    console.log(`\nManifest written to ${MANIFEST_PATH} (${fullManifest.length} files)`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd media/scripts && npx vitest run build.test.js`
Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add media/scripts/package.json media/scripts/package-lock.json media/scripts/build.js media/scripts/build.test.js
git commit -m "feat(media): add image build script with sharp resizing and validation"
```

### Task 15: Media Sync Script

**Files:**
- Create: `media/scripts/sync.js`

- [ ] **Step 1: Write the sync script**

Create `media/scripts/sync.js`:

```js
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MEDIA_ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = join(MEDIA_ROOT, 'manifest.json');

// R2 configuration via environment variables
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME
} = process.env;

/** Validate R2 env vars and create client. Exported for testing. */
export function createR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('Missing R2 environment variables. Required:');
    console.error('  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
}

/** Check if a key exists in the bucket. Exported for testing. */
export async function fileExistsInBucket(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// CLI entry point
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const client = createR2Client();
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));

  let uploaded = 0;
  let skipped = 0;

  for (const entry of manifest) {
    const exists = await fileExistsInBucket(client, R2_BUCKET_NAME, entry.file);
    if (exists) {
      console.log(`  skip: ${entry.file} (already exists)`);
      skipped++;
      continue;
    }

    const filePath = join(MEDIA_ROOT, entry.file);
    const body = await readFile(filePath);

    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: entry.file,
      Body: body,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable'
    }));

    console.log(`  upload: ${entry.file}`);
    uploaded++;
  }

  console.log(`\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add media/scripts/sync.js
git commit -m "feat(media): add R2 sync script with skip-existing logic"
```

### Task 16: Update .gitignore for Media Pipeline

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add media pipeline gitignore entries**

Append to `.gitignore`:

```
# Media pipeline (generated files)
media/originals/
media/360-photos/
media/thumbnails/
media/manifest.json
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore media pipeline generated files"
```

### Task 17: Root-Level npm Scripts

**Files:**
- Create: `package.json` (root)

- [ ] **Step 1: Create root package.json**

Create `package.json` at the project root:

```json
{
  "name": "vrtours-2026",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "cd app && npm run dev",
    "build": "cd app && npm run build",
    "test": "npm run test:schema && npm run test:client && npm run test:media",
    "test:schema": "cd schema && node validate.js",
    "test:client": "cd app && npm run test:client",
    "test:media": "cd media/scripts && npx vitest run",
    "media:build": "cd media/scripts && node build.js",
    "media:sync": "cd media/scripts && node sync.js"
  }
}
```

- [ ] **Step 2: Verify test commands work**

Run: `npm test`
Expected: Output shows `✓ example-campus-tour.yaml` from schema validation, then Vitest output showing all client tests passing, then Vitest output showing media build tests passing.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add root package.json with workspace scripts"
```

### Task 18: Update Media README

**Files:**
- Modify: `media/README.md` (file already exists with placeholder content)

- [ ] **Step 1: Replace with finalized pipeline documentation**

```markdown
# Media

All 360° photos and thumbnails for VR tours.

**Team:** Media Team

## Workflow

1. Capture 360° photos with Insta360.
2. Export equirectangular JPEGs from Insta360 Studio.
3. Place originals in `originals/` (gitignored).
4. Run `npm run media:build` from project root to generate optimized variants.
5. Run `npm run media:sync` from project root to upload to R2.

## Folder Structure

- `originals/` — Raw equirectangular JPEGs from camera (gitignored)
- `360-photos/` — Generated resolution variants (gitignored)
- `thumbnails/` — Generated preview images (gitignored)
- `scripts/` — Build and sync tooling (in git)

## Naming Convention

Files must be **kebab-case** and match the `media` field in tour YAML files:

```
originals/main-entrance.jpg     → 360-photos/main-entrance-8k.jpg
                                  360-photos/main-entrance-4k.jpg
                                  360-photos/main-entrance-2k.jpg
                                  thumbnails/main-entrance-thumb.jpg
```

## Requirements

- Format: JPEG
- Aspect ratio: 2:1 (equirectangular)
- Minimum resolution: 2048px wide (larger is better — 8K+ recommended)

## R2 Sync

Set these environment variables before running `npm run media:sync`:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
```

- [ ] **Step 2: Commit**

```bash
git add media/README.md
git commit -m "docs(media): update README with finalized pipeline workflow"
```

### Task 19: Final Integration Verification

- [ ] **Step 1: Run all tests from project root**

Run: `npm test`
Expected: Schema validation and all client unit tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Vite builds successfully. `app/dist/` contains `index.html`, JS bundle, and `tours/` directory with JSON files.

- [ ] **Step 3: Verify build output contains tour JSON**

Run: `ls app/dist/tours/`
Expected: `example-campus-tour.json` and `index.json`.

- [ ] **Step 4: Commit any fixes needed**

If any fixes were needed during integration verification, stage only the specific changed files and commit:

```bash
git add <specific files that were fixed>
git commit -m "fix: integration fixes from final verification"
```
