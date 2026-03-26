import { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import { yawPitchToVector3 } from './math-utils.js';

/**
 * OverlaySystem — computes overlay placement from YAML definitions
 * and manages semi-transparent text card meshes in the scene.
 *
 * createOverlayData() is pure (no Babylon dependency, fully testable).
 * placeOverlays()/clearOverlays() manage Babylon meshes.
 */
export class OverlaySystem {
  constructor({ radius = 10 } = {}) {
    this._radius = radius;
    this._meshes = [];
  }

  createOverlayData(overlays) {
    if (!overlays || overlays.length === 0) return [];
    return overlays.map(ov => ({
      text: ov.text,
      position: yawPitchToVector3(ov.yaw, ov.pitch, this._radius)
    }));
  }

  placeOverlays(scene, overlayData) {
    for (let i = 0; i < overlayData.length; i++) {
      const ov = overlayData[i];
      const plane = MeshBuilder.CreatePlane(`overlay-${i}`, { width: 2, height: 2 }, scene);
      plane.position = new Vector3(ov.position.x, ov.position.y, ov.position.z);
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      const mat = new StandardMaterial(`overlay-mat-${i}`, scene);
      mat.emissiveColor = new Color3(0, 0, 0);
      mat.alpha = 0.7;
      mat.disableLighting = true;
      plane.material = mat;
      const texture = AdvancedDynamicTexture.CreateForMesh(plane);
      const textBlock = new TextBlock();
      textBlock.text = ov.text;
      textBlock.color = 'white';
      textBlock.fontSize = 100;
      textBlock.textWrapping = true;
      texture.addControl(textBlock);
      plane.isPickable = false;
      this._meshes.push(plane);
    }
  }

  clearOverlays() {
    for (const mesh of this._meshes) mesh.dispose();
    this._meshes = [];
  }
}
