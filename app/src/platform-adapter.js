import { RESOLUTION_TIERS } from './config.js';

/**
 * Detect the platform from the navigator object.
 * VR detection is async — call checkVRSupport() separately.
 * @param {object} nav - navigator-like object (for testability)
 * @returns {'desktop' | 'mobile'}
 */
export function detectPlatform(nav) {
  const ua = nav.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Get the resolution tier string ('8k', '4k', '2k') for a platform. */
export function getResolutionTier(platform) {
  return RESOLUTION_TIERS[platform] || '4k';
}

/** Check if WebXR immersive-vr is supported. */
export async function checkVRSupport() {
  if (typeof navigator === 'undefined' || !navigator.xr) return false;
  try { return await navigator.xr.isSessionSupported('immersive-vr'); }
  catch { return false; }
}

/** Set up input handling (camera controls, zoom disable, mobile gyroscope). */
export function setupInput(scene, camera, platform) {
  const canvas = scene.getEngine().getRenderingCanvas();
  camera.attachControl(canvas, true);
  camera.inputs.attached.mousewheel?.detachControl();
  if (platform === 'mobile') {
    camera.inputs.addDeviceOrientationInput?.();
  }
}

/**
 * Dev mode: log yaw/pitch coordinates on click for the Tour Design team.
 * Enabled via ?dev=true URL parameter.
 * Uses onPointerObservable so it coexists with hotspot click handling.
 */
export function enableDevCoordinates(scene) {
  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== 1) return; // 1 = POINTERDOWN
    const pickResult = pointerInfo.pickInfo;
    if (!pickResult.hit || !pickResult.pickedPoint) return;
    const pos = pickResult.pickedPoint;
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const yaw = ((Math.atan2(pos.x, pos.z) * 180) / Math.PI + 360) % 360;
    const pitch = (Math.asin(pos.y / r) * 180) / Math.PI;
    console.log(`[dev] yaw: ${yaw.toFixed(1)}, pitch: ${pitch.toFixed(1)}`);
  });
}
