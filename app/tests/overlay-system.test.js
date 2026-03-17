import { describe, it, expect, vi } from 'vitest';

vi.mock('@babylonjs/core', () => ({
  MeshBuilder: { CreatePlane: vi.fn(() => ({ position: {}, billboardMode: null, material: null, isPickable: false, dispose: vi.fn() })) },
  StandardMaterial: vi.fn(() => ({ emissiveColor: null, alpha: 1, disableLighting: false })),
  Color3: vi.fn((r, g, b) => ({ r, g, b })),
  Vector3: vi.fn((x, y, z) => ({ x, y, z })),
  Mesh: { BILLBOARDMODE_ALL: 7 }
}));

vi.mock('@babylonjs/gui', () => ({
  AdvancedDynamicTexture: { CreateForMesh: vi.fn(() => ({ addControl: vi.fn() })) },
  TextBlock: vi.fn(() => ({ text: '', color: '', fontSize: 0, textWrapping: false }))
}));

import { OverlaySystem } from '../src/overlay-system.js';
import { yawPitchToVector3 } from '../src/math-utils.js';

describe('OverlaySystem', () => {
  it('creates overlay data from location overlays', () => {
    const system = new OverlaySystem({ radius: 10 });
    const overlays = [{ text: 'Founded in 1875', yaw: 180, pitch: 15 }];
    const result = system.createOverlayData(overlays);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Founded in 1875');
    const expected = yawPitchToVector3(180, 15, 10);
    expect(result[0].position.x).toBeCloseTo(expected.x, 5);
    expect(result[0].position.y).toBeCloseTo(expected.y, 5);
    expect(result[0].position.z).toBeCloseTo(expected.z, 5);
  });

  it('returns empty array for undefined overlays', () => {
    const system = new OverlaySystem({ radius: 10 });
    expect(system.createOverlayData(undefined)).toEqual([]);
    expect(system.createOverlayData([])).toEqual([]);
  });
});
