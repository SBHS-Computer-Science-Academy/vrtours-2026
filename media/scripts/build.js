import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MEDIA_ROOT = resolve(__dirname, '..');
const ORIGINALS_DIR = join(MEDIA_ROOT, 'originals');
const PHOTOS_DIR = join(MEDIA_ROOT, '360-photos');
const VIDEOS_DIR = join(MEDIA_ROOT, 'videos');
const THUMBS_DIR = join(MEDIA_ROOT, 'thumbnails');
const MANIFEST_PATH = join(MEDIA_ROOT, 'manifest.json');

const RESOLUTIONS = {
  '8k': { width: 8192, height: 4096 },
  '4k': { width: 4096, height: 2048 },
  '2k': { width: 2048, height: 1024 }
};

const THUMB_SIZE = { width: 400, height: 300 };
const MIN_WIDTH = 2048;

const VIDEO_RESOLUTIONS = {
  '4k': { width: 3840, height: 1920 },
  '1080p': { width: 1920, height: 960 },
  '720p': { width: 1440, height: 720 }
};
const VIDEO_MIN_WIDTH = 1440;

// --- Photos ---

export function validateImage(filename, meta) {
  if (meta.format !== 'jpeg') {
    return { valid: false, error: `${filename}: must be JPEG format, got ${meta.format}` };
  }
  const ratio = meta.width / meta.height;
  const warnings = [];
  if (Math.abs(ratio - 2.0) > 0.05) {
    warnings.push(`${filename}: expected 2:1 aspect ratio for equirectangular, got ${ratio.toFixed(2)}:1 (will process anyway)`);
  }
  if (meta.width < MIN_WIDTH) {
    return { valid: false, error: `${filename}: minimum resolution is ${MIN_WIDTH}px wide, got ${meta.width}px` };
  }
  return { valid: true, warnings };
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
  for (const w of validation.warnings ?? []) console.warn(`  ⚠ ${w}`);

  const outputs = getOutputFilenames(filename);
  const manifest = [];

  for (const [tier, dims] of Object.entries(RESOLUTIONS)) {
    if (meta.width >= dims.width) {
      const outputPath = join(PHOTOS_DIR, outputs[tier]);
      await sharp(inputPath).resize(dims.width, dims.height, { fit: 'fill' }).jpeg({ quality: 85 }).toFile(outputPath);
      const { size } = await stat(outputPath);
      manifest.push({ file: `360-photos/${outputs[tier]}`, width: dims.width, height: dims.height, size, tier });
    }
  }

  const thumbPath = join(THUMBS_DIR, outputs.thumb);
  await sharp(inputPath).resize(THUMB_SIZE.width, THUMB_SIZE.height, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);
  const { size: thumbSize } = await stat(thumbPath);
  manifest.push({ file: `thumbnails/${outputs.thumb}`, width: THUMB_SIZE.width, height: THUMB_SIZE.height, size: thumbSize, tier: 'thumb' });

  return manifest;
}

// --- Videos ---

export function validateVideo(filename, videoStream) {
  if (!videoStream) {
    return { valid: false, error: `${filename}: no video stream found` };
  }
  const ratio = videoStream.width / videoStream.height;
  if (Math.abs(ratio - 2.0) > 0.05) {
    return { valid: false, error: `${filename}: expected 2:1 aspect ratio for equirectangular, got ${ratio.toFixed(2)}:1` };
  }
  if (videoStream.width < VIDEO_MIN_WIDTH) {
    return { valid: false, error: `${filename}: minimum resolution is ${VIDEO_MIN_WIDTH}px wide, got ${videoStream.width}px` };
  }
  return { valid: true };
}

export function getVideoOutputFilenames(originalFilename) {
  const base = originalFilename.replace(/\.(mp4|mov)$/i, '');
  return {
    '4k': `${base}-4k.mp4`,
    '1080p': `${base}-1080p.mp4`,
    '720p': `${base}-720p.mp4`,
    thumb: `${base}-thumb.jpg`
  };
}

function probeVideo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function transcodeVideo(inputPath, outputPath, width, height) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(`${width}x${height}`)
      .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

function extractThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(1)
      .frames(1)
      .videoFilter(`scale=${THUMB_SIZE.width}:${THUMB_SIZE.height}:force_original_aspect_ratio=increase,crop=${THUMB_SIZE.width}:${THUMB_SIZE.height}`)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function processVideo(filename) {
  const inputPath = join(ORIGINALS_DIR, filename);
  const probeData = await probeVideo(inputPath);
  const videoStream = probeData.streams.find(s => s.codec_type === 'video');
  const validation = validateVideo(filename, videoStream);
  if (!validation.valid) throw new Error(validation.error);

  const outputs = getVideoOutputFilenames(filename);
  const manifest = [];

  for (const [tier, dims] of Object.entries(VIDEO_RESOLUTIONS)) {
    if (videoStream.width >= dims.width) {
      const outputPath = join(VIDEOS_DIR, outputs[tier]);
      await transcodeVideo(inputPath, outputPath, dims.width, dims.height);
      const { size } = await stat(outputPath);
      manifest.push({ file: `videos/${outputs[tier]}`, width: dims.width, height: dims.height, size, tier });
    }
  }

  const thumbPath = join(THUMBS_DIR, outputs.thumb);
  await extractThumbnail(inputPath, thumbPath);
  const { size: thumbSize } = await stat(thumbPath);
  manifest.push({ file: `thumbnails/${outputs.thumb}`, width: THUMB_SIZE.width, height: THUMB_SIZE.height, size: thumbSize, tier: 'thumb' });

  return manifest;
}

// --- Main ---

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    await mkdir(PHOTOS_DIR, { recursive: true });
    await mkdir(VIDEOS_DIR, { recursive: true });
    await mkdir(THUMBS_DIR, { recursive: true });

    let files;
    try { files = await readdir(ORIGINALS_DIR); }
    catch { console.log('No media/originals/ directory found. Nothing to process.'); process.exit(0); }

    const imageFiles = files.filter(f => /\.jpe?g$/i.test(f));
    const videoFiles = files.filter(f => /\.(mp4|mov)$/i.test(f));

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      console.log('No JPEG or MP4/MOV files found in media/originals/. Nothing to process.');
      process.exit(0);
    }

    const fullManifest = [];

    for (const file of imageFiles) {
      console.log(`Processing ${file}...`);
      const entries = await processImage(file);
      fullManifest.push(...entries);
      console.log(`  ✓ Generated ${entries.length} files`);
    }

    for (const file of videoFiles) {
      console.log(`Processing ${file}...`);
      const entries = await processVideo(file);
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
