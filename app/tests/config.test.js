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
    expect(RESOLUTION_TIERS).toEqual({ vr: '8k', desktop: '4k', mobile: '2k' });
  });

  it('detects dev mode from URL param', async () => {
    const { isDevMode } = await import('../src/config.js');
    expect(isDevMode('https://example.com?dev=true')).toBe(true);
    expect(isDevMode('https://example.com')).toBe(false);
  });
});
