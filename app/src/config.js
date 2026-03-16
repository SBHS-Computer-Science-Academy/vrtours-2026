export const RESOLUTION_TIERS = { vr: '8k', desktop: '4k', mobile: '2k' };

export function getConfig() {
  const raw = import.meta.env.VITE_MEDIA_BASE_URL || '';
  const mediaBaseUrl = raw ? raw.replace(/\/+$/, '') : '/media';

  return {
    mediaBaseUrl,
    resolvePhotoUrl(filename, resolution) {
      const base = filename.replace(/\.jpg$/, '');
      return `${mediaBaseUrl}/360-photos/${base}-${resolution}.jpg`;
    },
    resolveThumbnailUrl(filename) {
      return `${mediaBaseUrl}/thumbnails/${filename}`;
    }
  };
}

export function isDevMode(url) {
  try {
    return new URL(url).searchParams.get('dev') === 'true';
  } catch {
    return false;
  }
}
