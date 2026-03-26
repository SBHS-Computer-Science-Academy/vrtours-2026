import { describe, it, expect } from 'vitest';
import { validateImage, getOutputFilenames, validateVideo, getVideoOutputFilenames } from './build.js';

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

describe('validateVideo', () => {
  it('accepts a valid equirectangular video stream', () => {
    const stream = { codec_type: 'video', width: 3840, height: 1920 };
    expect(validateVideo('campus-tour.mp4', stream).valid).toBe(true);
  });

  it('rejects non-2:1 aspect ratio', () => {
    const stream = { codec_type: 'video', width: 1920, height: 1080 };
    const result = validateVideo('campus-tour.mp4', stream);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('aspect ratio');
  });

  it('rejects video below minimum resolution', () => {
    const stream = { codec_type: 'video', width: 1280, height: 640 };
    const result = validateVideo('campus-tour.mp4', stream);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('resolution');
  });

  it('rejects missing video stream', () => {
    const result = validateVideo('campus-tour.mp4', null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no video stream');
  });
});

describe('getVideoOutputFilenames', () => {
  it('generates resolution variants and thumbnail for mp4', () => {
    const result = getVideoOutputFilenames('campus-tour.mp4');
    expect(result).toEqual({
      '4k': 'campus-tour-4k.mp4',
      '1080p': 'campus-tour-1080p.mp4',
      '720p': 'campus-tour-720p.mp4',
      thumb: 'campus-tour-thumb.jpg'
    });
  });

  it('generates filenames for mov input', () => {
    const result = getVideoOutputFilenames('campus-tour.mov');
    expect(result['4k']).toBe('campus-tour-4k.mp4');
    expect(result.thumb).toBe('campus-tour-thumb.jpg');
  });
});
