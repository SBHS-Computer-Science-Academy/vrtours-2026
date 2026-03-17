import { StackPanel, Button, Control, Rectangle, ScrollViewer } from '@babylonjs/gui';

/**
 * LocationPicker — manages the data model and Babylon.js GUI for
 * the location picker menu. Shows all tour locations so users can
 * jump to any point in the tour.
 *
 * Data methods (setLocations, getSelectableItems) are pure and testable.
 * GUI methods (buildPickerUI, updateUI, toggle) require Babylon.js.
 */
export class LocationPicker {
  constructor() {
    this._items = [];
    this._currentLocationId = null;
    this._onSelect = null;
    this._guiPanel = null;
  }

  set onSelect(fn) { this._onSelect = fn; }
  get items() { return this._items; }
  get currentLocationId() { return this._currentLocationId; }

  setLocations(locations, mediaBaseUrl) {
    this._items = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      thumbnailUrl: loc.thumbnail ? `${mediaBaseUrl}/thumbnails/${loc.thumbnail}` : null
    }));
  }

  setCurrentLocation(locationId) { this._currentLocationId = locationId; }

  getSelectableItems() {
    return this._items.filter(item => item.id !== this._currentLocationId);
  }

  buildPickerUI(advancedTexture) {
    const container = new Rectangle('picker-container');
    container.width = '300px';
    container.height = '100%';
    container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.background = 'rgba(0, 0, 0, 0.8)';
    container.isVisible = false;
    advancedTexture.addControl(container);
    const scrollViewer = new ScrollViewer('picker-scroll');
    scrollViewer.width = '100%';
    scrollViewer.height = '100%';
    container.addControl(scrollViewer);
    const panel = new StackPanel('picker-panel');
    panel.width = '100%';
    scrollViewer.addControl(panel);
    this._guiPanel = container;
    this._stackPanel = panel;
    return container;
  }

  toggle() {
    if (this._guiPanel) this._guiPanel.isVisible = !this._guiPanel.isVisible;
  }

  updateUI() {
    if (!this._stackPanel) return;
    this._stackPanel.clearControls();
    for (const item of this.getSelectableItems()) {
      const btn = Button.CreateSimpleButton(`pick-${item.id}`, item.name);
      btn.width = '280px';
      btn.height = '50px';
      btn.color = 'white';
      btn.background = 'rgba(50, 50, 80, 0.9)';
      btn.onPointerClickObservable.add(() => { if (this._onSelect) this._onSelect(item.id); });
      this._stackPanel.addControl(btn);
    }
  }
}
