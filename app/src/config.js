/** Resolution tiers: VR gets 8K, desktop 4K, mobile 2K. */
export const RESOLUTION_TIERS = { vr: '8k', desktop: '4k', mobile: '2k' };

/**
 * Build the app config from environment variables.
 * Media URL resolution is handled by TourLoader, not here —
 * this just provides the base URL.
 */
export function getConfig() {
  const raw = import.meta.env.VITE_MEDIA_BASE_URL || '';
  const mediaBaseUrl = raw ? raw.replace(/\/+$/, '') : '/media';
  return { mediaBaseUrl };
}

/** Check if dev mode is enabled via ?dev=true URL parameter. */
export function isDevMode(url) {
  try {
    return new URL(url).searchParams.get('dev') === 'true';
  } catch {
    return false;
  }
}
