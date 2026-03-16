import { RESOLUTION_TIERS } from './config.js';

export function detectPlatform(nav) {
  const ua = nav.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getResolutionTier(platform) {
  return RESOLUTION_TIERS[platform] || '4k';
}

export async function checkVRSupport() {
  if (typeof navigator === 'undefined' || !navigator.xr) return false;
  try { return await navigator.xr.isSessionSupported('immersive-vr'); }
  catch { return false; }
}

export function setupInput(scene, camera, platform) {
  const canvas = scene.getEngine().getRenderingCanvas();
  camera.attachControl(canvas, true);
  camera.inputs.attached.mousewheel?.detachControl();
  if (platform === 'mobile') {
    camera.inputs.addDeviceOrientationInput?.();
  }
}

export function enableDevCoordinates(scene) {
  scene.onPointerDown = (_evt, pickResult) => {
    if (!pickResult.hit || !pickResult.pickedPoint) return;
    const pos = pickResult.pickedPoint;
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const yaw = ((Math.atan2(pos.x, pos.z) * 180) / Math.PI + 360) % 360;
    const pitch = (Math.asin(pos.y / r) * 180) / Math.PI;
    console.log(`[dev] yaw: ${yaw.toFixed(1)}, pitch: ${pitch.toFixed(1)}`);
  };
}
