# Media

All 360° photos and thumbnails for VR tours.

**Team:** Media Team

## Workflow

### Photos
1. Capture 360° photos with Insta360.
2. Export equirectangular JPEGs from Insta360 Studio.
3. Place originals in `originals/` (gitignored).
4. Run `npm run media:build` from project root to generate optimized variants.
5. Run `npm run media:sync` from project root to upload to R2.

### Videos
1. Capture 360° video with Insta360.
2. Export equirectangular MP4 or MOV from Insta360 Studio.
3. Place originals in `originals/` (gitignored).
4. Run `npm run media:build` from project root — photos and videos are processed together.
5. Run `npm run media:sync` from project root to upload to R2.

## Folder Structure

- `originals/` — Raw equirectangular JPEGs/MP4s/MOVs from camera (gitignored)
- `360-photos/` — Generated photo resolution variants (gitignored)
- `videos/` — Generated video resolution variants (gitignored)
- `thumbnails/` — Generated preview images for photos and videos (gitignored)
- `scripts/` — Build and sync tooling (in git)

## Naming Convention

Files must be **kebab-case** and match the `media` field in tour YAML files:

```
originals/main-entrance.jpg     → 360-photos/main-entrance-8k.jpg
                                  360-photos/main-entrance-4k.jpg
                                  360-photos/main-entrance-2k.jpg
                                  thumbnails/main-entrance-thumb.jpg

originals/campus-tour.mp4       → videos/campus-tour-4k.mp4
                                  videos/campus-tour-1080p.mp4
                                  videos/campus-tour-720p.mp4
                                  thumbnails/campus-tour-thumb.jpg
```

## Requirements

### Photos
- Format: JPEG
- Aspect ratio: 2:1 (equirectangular)
- Minimum resolution: 2048px wide (larger is better — 8K+ recommended)

### Videos
- Format: MP4 or MOV (output is always H.264 MP4)
- Aspect ratio: 2:1 (equirectangular)
- Minimum resolution: 1440px wide (1080p+ recommended — 4K ideal)

## R2 Sync

Set these environment variables before running `npm run media:sync`:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
