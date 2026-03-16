import { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';
import { yawPitchToVector3 } from './math-utils.js';

export class HotspotSystem {
  constructor({ radius = 10 } = {}) {
    this._radius = radius;
    this._meshes = [];
    this._onSelect = null;
  }

  set onSelect(fn) { this._onSelect = fn; }

  createHotspotData(hotspots) {
    if (!hotspots || hotspots.length === 0) return [];
    return hotspots.map(hs => ({
      target: hs.target,
      label: hs.label || hs.target,
      position: yawPitchToVector3(hs.yaw, hs.pitch, this._radius)
    }));
  }

  placeHotspots(scene, hotspotData) {
    for (const hs of hotspotData) {
      const mesh = MeshBuilder.CreatePlane(`hotspot-${hs.target}`, { width: 0.6, height: 0.6 }, scene);
      mesh.position = new Vector3(hs.position.x, hs.position.y, hs.position.z);
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.metadata = { target: hs.target, label: hs.label };
      const mat = new StandardMaterial(`hotspot-mat-${hs.target}`, scene);
      mat.emissiveColor = new Color3(0.2, 0.6, 1);
      mat.alpha = 0.8;
      mat.disableLighting = true;
      mesh.material = mat;
      mesh.isPickable = true;
      this._meshes.push(mesh);
    }
  }

  clearHotspots() {
    for (const mesh of this._meshes) mesh.dispose();
    this._meshes = [];
  }
}
