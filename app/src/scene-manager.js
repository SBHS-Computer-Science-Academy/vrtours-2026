export class SceneManager {
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
