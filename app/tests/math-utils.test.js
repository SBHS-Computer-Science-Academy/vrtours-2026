import { describe, it, expect } from 'vitest';
import { yawPitchToVector3 } from '../src/math-utils.js';

describe('yawPitchToVector3', () => {
  it('converts yaw=0, pitch=0 to forward direction (0, 0, 1)', () => {
    const v = yawPitchToVector3(0, 0, 10);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(10, 5);
  });

  it('converts yaw=90, pitch=0 to right direction (1, 0, 0)', () => {
    const v = yawPitchToVector3(90, 0, 10);
    expect(v.x).toBeCloseTo(10, 4);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 4);
  });

  it('converts yaw=0, pitch=90 to up direction (0, 1, 0)', () => {
    const v = yawPitchToVector3(0, 90, 10);
    expect(v.x).toBeCloseTo(0, 4);
    expect(v.y).toBeCloseTo(10, 4);
    expect(v.z).toBeCloseTo(0, 4);
  });

  it('converts yaw=0, pitch=-90 to down direction (0, -1, 0)', () => {
    const v = yawPitchToVector3(0, -90, 10);
    expect(v.x).toBeCloseTo(0, 4);
    expect(v.y).toBeCloseTo(-10, 4);
    expect(v.z).toBeCloseTo(0, 4);
  });

  it('uses default radius of 10', () => {
    const v = yawPitchToVector3(0, 0);
    expect(v.z).toBeCloseTo(10, 5);
  });

  it('respects custom radius', () => {
    const v = yawPitchToVector3(0, 0, 5);
    expect(v.z).toBeCloseTo(5, 5);
  });
});
