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
