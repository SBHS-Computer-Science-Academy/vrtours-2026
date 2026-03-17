import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MEDIA_ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = join(MEDIA_ROOT, 'manifest.json');

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;

export function createR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('Missing R2 environment variables. Required:');
    console.error('  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
  });
}

export async function fileExistsInBucket(client, bucket, key) {
  try { await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true; }
  catch { return false; }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const client = createR2Client();
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
  let uploaded = 0, skipped = 0;

  for (const entry of manifest) {
    const exists = await fileExistsInBucket(client, R2_BUCKET_NAME, entry.file);
    if (exists) { console.log(`  skip: ${entry.file} (already exists)`); skipped++; continue; }
    const filePath = join(MEDIA_ROOT, entry.file);
    const body = await readFile(filePath);
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME, Key: entry.file, Body: body,
      ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable'
    }));
    console.log(`  upload: ${entry.file}`);
    uploaded++;
  }
  console.log(`\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}`);
}
