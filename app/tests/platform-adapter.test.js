import { describe, it, expect, vi } from 'vitest';
import { detectPlatform, getResolutionTier, enableDevCoordinates } from '../src/platform-adapter.js';

describe('detectPlatform', () => {
  it('returns "desktop" for standard navigator', () => {
    expect(detectPlatform({ xr: undefined, userAgent: 'Mozilla/5.0 (Macintosh)' })).toBe('desktop');
  });
  it('returns "mobile" for mobile user agent', () => {
    expect(detectPlatform({ xr: undefined, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)' })).toBe('mobile');
  });
  it('returns "mobile" for Android user agent', () => {
    expect(detectPlatform({ xr: undefined, userAgent: 'Mozilla/5.0 (Linux; Android 13)' })).toBe('mobile');
  });
});

describe('getResolutionTier', () => {
  it('returns "4k" for desktop', () => { expect(getResolutionTier('desktop')).toBe('4k'); });
  it('returns "2k" for mobile', () => { expect(getResolutionTier('mobile')).toBe('2k'); });
  it('returns "8k" for vr', () => { expect(getResolutionTier('vr')).toBe('8k'); });
});

describe('enableDevCoordinates', () => {
  it('sets onPointerDown handler on the scene', () => {
    const mockScene = { onPointerDown: null };
    enableDevCoordinates(mockScene);
    expect(typeof mockScene.onPointerDown).toBe('function');
  });
});
