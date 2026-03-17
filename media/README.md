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
