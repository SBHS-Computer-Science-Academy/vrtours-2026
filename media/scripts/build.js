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

export function getOutputFilenames(originalFilename) {
  const base = originalFilename.replace(/\.jpg$/i, '');
  return {
    '8k': `${base}-8k.jpg`,
    '4k': `${base}-4k.jpg`,
    '2k': `${base}-2k.jpg`,
    thumb: `${base}-thumb.jpg`
  };
}

async function processImage(filename) {
  const inputPath = join(ORIGINALS_DIR, filename);
  const meta = await sharp(inputPath).metadata();
  const validation = validateImage(filename, meta);
  if (!validation.valid) throw new Error(validation.error);

  const outputs = getOutputFilenames(filename);
  const manifest = [];

  for (const [tier, dims] of Object.entries(RESOLUTIONS)) {
    if (meta.width >= dims.width) {
      const outputPath = join(PHOTOS_DIR, outputs[tier]);
      await sharp(inputPath).resize(dims.width, dims.height, { fit: 'fill' }).jpeg({ quality: 85 }).toFile(outputPath);
      manifest.push({ file: `360-photos/${outputs[tier]}`, width: dims.width, height: dims.height, tier });
    }
  }

  const thumbPath = join(THUMBS_DIR, outputs.thumb);
  await sharp(inputPath).resize(THUMB_SIZE.width, THUMB_SIZE.height, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);
  manifest.push({ file: `thumbnails/${outputs.thumb}`, width: THUMB_SIZE.width, height: THUMB_SIZE.height, tier: 'thumb' });

  return manifest;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    await mkdir(PHOTOS_DIR, { recursive: true });
    await mkdir(THUMBS_DIR, { recursive: true });
    let files;
    try { files = (await readdir(ORIGINALS_DIR)).filter(f => /\.jpe?g$/i.test(f)); }
    catch { console.log('No media/originals/ directory found. Nothing to process.'); process.exit(0); }
    if (files.length === 0) { console.log('No JPEG files found in media/originals/. Nothing to process.'); process.exit(0); }

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
