import {
  Engine, Scene, ArcRotateCamera, Vector3, PhotoDome, VideoDome,
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
import { showHomepage, hideHomepage } from './homepage.js';

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

const config = getConfig();
const devMode = isDevMode(window.location.href);

let engine = null;
let currentScene = null;
let allTourData = [];
let currentFade = null;
let isStarting = false;

async function returnToHomepage() {
  if (currentFade) {
    await animateAlpha(currentFade.mat, 0, 1, 300);
    currentFade = null;
  }
  if (currentScene) {
    currentScene.dispose();
    currentScene = null;
  }
  if (engine) engine.stopRenderLoop();
  const tourMeta = allTourData.map(({ id, name, description, thumbnail }) => ({
    id, name, description, thumbnail
  }));
  showHomepage(tourMeta, startTour);
}

async function startTour(tourId) {
  if (isStarting) return;
  isStarting = true;
  const tourData = allTourData.find(t => t.id === tourId);
  if (!tourData) { console.error(`Tour not found: ${tourId}`); return; }

  await hideHomepage();

  const canvas = document.getElementById('app');
  if (!engine) {
    engine = new Engine(canvas, true);
    window.addEventListener('resize', () => engine.resize());
  }

  currentScene = new Scene(engine);
  const scene = currentScene;

  let platform = detectPlatform(navigator);
  const vrSupported = await checkVRSupport();
  if (vrSupported) platform = 'vr';
  const resolution = getResolutionTier(platform);

  const camera = new ArcRotateCamera('camera', 0, Math.PI / 2, 0.1, Vector3.Zero(), scene);
  setupInput(scene, camera, platform);

  const fade = createFadeOverlay(scene);
  currentFade = fade;

  async function createPhotoDome(_scene, url) {
    if (url.endsWith('.mp4')) {
      return new VideoDome('videodome', url, { resolution: 32, size: 1000, loop: true, autoPlay: true }, _scene);
    }
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

  tourLoader.loadTour(tourData);

  const fullscreenUI = AdvancedDynamicTexture.CreateFullscreenUI('ui');
  locationPicker.setLocations(tourLoader.getAllLocations(), config.mediaBaseUrl);
  locationPicker.buildPickerUI(fullscreenUI);

  const menuBtn = Button.CreateSimpleButton('menu-btn', '☰');
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

  const changeTourBtn = Button.CreateSimpleButton('change-tour-btn', '← Tours');
  changeTourBtn.width = '80px';
  changeTourBtn.height = '50px';
  changeTourBtn.color = 'white';
  changeTourBtn.background = 'rgba(0,0,0,0.5)';
  changeTourBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  changeTourBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  changeTourBtn.top = '10px';
  changeTourBtn.left = '10px';
  changeTourBtn.onPointerClickObservable.add(() => returnToHomepage());
  fullscreenUI.addControl(changeTourBtn);

  async function navigateTo(locationId) {
    const location = tourLoader.getLocation(locationId);
    if (!location) return;
    const mediaUrl = tourLoader.resolveMediaUrl(location.media, resolution);
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
  isStarting = false;
}

async function initHomepage() {
  const index = await fetch('/tours/index.json').then(r => r.json());
  const dataList = await Promise.all(index.map(f => fetch(`/tours/${f}`).then(r => r.json())));
  allTourData = dataList.map((data, i) => ({
    ...data,
    id: index[i].replace('.json', ''),
  }));
  const tourMeta = allTourData.map(({ id, name, description, thumbnail }) => ({
    id, name, description, thumbnail
  }));
  showHomepage(tourMeta, startTour);
}

initHomepage().catch(err => {
  console.error(err);
  const el = document.getElementById('homepage');
  if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:16px;color:#c9a84c;">Failed to load tours. Please refresh the page.</div>';
});
