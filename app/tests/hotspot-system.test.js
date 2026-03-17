import { describe, it, expect, vi } from 'vitest';

vi.mock('@babylonjs/core', () => ({
  MeshBuilder: { CreatePlane: vi.fn(() => ({ position: {}, billboardMode: null, metadata: null, material: null, isPickable: false, dispose: vi.fn() })) },
  StandardMaterial: vi.fn(() => ({ emissiveColor: null, alpha: 1, disableLighting: false })),
  Color3: vi.fn((r, g, b) => ({ r, g, b })),
  Vector3: vi.fn((x, y, z) => ({ x, y, z })),
  Mesh: { BILLBOARDMODE_ALL: 7 }
}));

import { HotspotSystem } from '../src/hotspot-system.js';
import { yawPitchToVector3 } from '../src/math-utils.js';

describe('HotspotSystem', () => {
  it('creates hotspot data from location hotspots', () => {
    const system = new HotspotSystem({ radius: 10 });
    const hotspots = [
      { target: 'lobby', yaw: 90, pitch: 0, label: 'To Lobby' },
      { target: 'gym', yaw: 270, pitch: -5 }
    ];
    const result = system.createHotspotData(hotspots);
    expect(result).toHaveLength(2);
    expect(result[0].target).toBe('lobby');
    expect(result[0].label).toBe('To Lobby');
    expect(result[0].position.x).toBeCloseTo(10, 4);
    expect(result[1].target).toBe('gym');
    expect(result[1].label).toBe('gym');
  });

  it('returns empty array for undefined hotspots', () => {
    const system = new HotspotSystem({ radius: 10 });
    expect(system.createHotspotData(undefined)).toEqual([]);
    expect(system.createHotspotData([])).toEqual([]);
  });

  it('uses math-utils for position calculation', () => {
    const system = new HotspotSystem({ radius: 5 });
    const result = system.createHotspotData([{ target: 'test', yaw: 45, pitch: 30 }]);
    const expected = yawPitchToVector3(45, 30, 5);
    expect(result[0].position.x).toBeCloseTo(expected.x, 5);
    expect(result[0].position.y).toBeCloseTo(expected.y, 5);
    expect(result[0].position.z).toBeCloseTo(expected.z, 5);
  });
});
