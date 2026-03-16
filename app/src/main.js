import {
  Engine, Scene, ArcRotateCamera, Vector3, PhotoDome,
  MeshBuilder, StandardMaterial, Color3
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui';

import { getConfig, isDevMode } from './config.js';
import { TourLoader } from './tour-loader.js';
import { SceneManager } from './scene-manager.js';
import { HotspotSystem } from './hotspot-system.js';
import { OverlaySystem } from './overlay-system.js';
import { LocationPicker } from './location-picker.js';
import {
  detectPlatform, getResolutionTier, checkVRSupport, setupInput, enableDevCoordinates
} from './platform-adapter.js';

function createFadeOverlay(scene) {
  const plane = MeshBuilder.CreatePlane('fade-overlay', { size: 100 }, scene);
  plane.position = new Vector3(0, 0, 0.5);
  plane.billboardMode = 7;
  const mat = new StandardMaterial('fade-mat', scene);
  mat.emissiveColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.alpha = 0;
  plane.material = mat;
  plane.isPickable = false;
  plane.renderingGroupId = 1;
  return { plane, mat };
}

function animateAlpha(mat, from, to, duration) {
  return new Promise(resolve => {
    const start = performance.now();
    function step() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      mat.alpha = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

async function main() {
  const config = getConfig();
  const devMode = isDevMode(window.location.href);

  let platform = detectPlatform(navigator);
  const vrSupported = await checkVRSupport();
  if (vrSupported) platform = 'vr';
  const resolution = getResolutionTier(platform);

  const canvas = document.getElementById('app');
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  const camera = new ArcRotateCamera('camera', 0, Math.PI / 2, 0.1, Vector3.Zero(), scene);
  setupInput(scene, camera, platform);

  const fade = createFadeOverlay(scene);

  async function createPhotoDome(_scene, url) {
    return new PhotoDome('photodome', url, { resolution: 32, size: 1000 }, _scene);
  }

  async function animateFade(_scene, direction) {
    if (direction === 'out') await animateAlpha(fade.mat, 0, 1, 300);
    else await animateAlpha(fade.mat, 1, 0, 300);
  }

  const tourLoader = new TourLoader(config);
  const sceneManager = new SceneManager(scene, engine, { createPhotoDome, animateFade });
  const hotspotSystem = new HotspotSystem({ radius: 8 });
  const overlaySystem = new OverlaySystem({ radius: 9 });
  const locationPicker = new LocationPicker();

  const tourIndex = await fetch('/tours/index.json').then(r => r.json());
  if (tourIndex.length === 0) { console.error('No tours found'); return; }

  const tourData = await fetch(`/tours/${tourIndex[0]}`).then(r => r.json());
  tourLoader.loadTour(tourData);

  const fullscreenUI = AdvancedDynamicTexture.CreateFullscreenUI('ui');
  locationPicker.setLocations(tourLoader.getAllLocations(), config.mediaBaseUrl);
  locationPicker.buildPickerUI(fullscreenUI);

  const menuBtn = Button.CreateSimpleButton('menu-btn', '\u2630');
  menuBtn.width = '50px';
  menuBtn.height = '50px';
  menuBtn.color = 'white';
  menuBtn.background = 'rgba(0,0,0,0.5)';
  menuBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  menuBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  menuBtn.top = '10px';
  menuBtn.left = '-10px';
  menuBtn.onPointerClickObservable.add(() => locationPicker.toggle());
  fullscreenUI.addControl(menuBtn);

  async function navigateTo(locationId) {
    const location = tourLoader.getLocation(locationId);
    if (!location) return;
    const mediaUrl = tourLoader.resolvePhotoUrl(location.media, resolution);
    hotspotSystem.clearHotspots();
    overlaySystem.clearOverlays();
    await sceneManager.transitionTo(locationId, mediaUrl);
    const hotspotData = hotspotSystem.createHotspotData(location.hotspots);
    hotspotSystem.placeHotspots(scene, hotspotData);
    const overlayData = overlaySystem.createOverlayData(location.overlays);
    overlaySystem.placeOverlays(scene, overlayData);
    locationPicker.setCurrentLocation(locationId);
    locationPicker.updateUI();
  }

  hotspotSystem.onSelect = navigateTo;
  locationPicker.onSelect = (id) => { locationPicker.toggle(); navigateTo(id); };

  scene.onPointerDown = (_evt, pickResult) => {
    if (pickResult.hit && pickResult.pickedMesh?.metadata?.target) {
      navigateTo(pickResult.pickedMesh.metadata.target);
    }
  };

  if (devMode) enableDevCoordinates(scene);

  if (vrSupported) {
    await scene.createDefaultXRExperienceAsync({ floorMeshes: [] });
  }

  await navigateTo(tourLoader.startLocationId);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

main().catch(console.error);
