/**
 * SceneManager — owns the PhotoDome lifecycle and scene transitions.
 *
 * Accepts dependency-injected helpers (createPhotoDome, animateFade)
 * so the core logic is testable without a real WebGL context.
 */
export class SceneManager {
  /**
   * @param {object} scene - Babylon.js Scene
   * @param {object} engine - Babylon.js Engine
   * @param {{ createPhotoDome: Function, animateFade: Function }} helpers
   */
  constructor(scene, engine, helpers) {
    this._scene = scene;
    this._engine = engine;
    this._createPhotoDome = helpers.createPhotoDome;
    this._animateFade = helpers.animateFade;
    this._currentDome = null;
    this._currentLocationId = null;
    this._transitioning = false;
    this.onTransition = null;
  }

  get currentLocationId() { return this._currentLocationId; }

  /** Transition to a new location. Fades out → swaps PhotoDome → fades in. */
  async transitionTo(locationId, mediaUrl) {
    if (this._transitioning) return;
    this._transitioning = true;
    try {
      if (this._currentDome) {
        await this._animateFade(this._scene, 'out');
        this._currentDome.dispose();
      }
      this._currentDome = await this._createPhotoDome(this._scene, mediaUrl);
      this._currentLocationId = locationId;
      await this._animateFade(this._scene, 'in');
      if (this.onTransition) this.onTransition(locationId);
    } finally {
      this._transitioning = false;
    }
  }
}
