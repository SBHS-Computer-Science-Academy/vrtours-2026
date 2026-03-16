import { describe, it, expect, vi } from 'vitest';

vi.mock('@babylonjs/gui', () => ({
  StackPanel: vi.fn(() => ({ width: '', addControl: vi.fn(), clearControls: vi.fn() })),
  Button: { CreateSimpleButton: vi.fn(() => ({ width: '', height: '', color: '', background: '', onPointerClickObservable: { add: vi.fn() } })) },
  Control: { HORIZONTAL_ALIGNMENT_LEFT: 0 },
  Rectangle: vi.fn(() => ({ width: '', height: '', horizontalAlignment: null, background: '', isVisible: false, addControl: vi.fn() })),
  ScrollViewer: vi.fn(() => ({ width: '', height: '', addControl: vi.fn() }))
}));

import { LocationPicker } from '../src/location-picker.js';

const LOCATIONS = [
  { id: 'entrance', name: 'Entrance', thumbnail: 'entrance-thumb.jpg' },
  { id: 'lobby', name: 'Lobby' },
  { id: 'gym', name: 'Gymnasium', thumbnail: 'gym-thumb.jpg' }
];

describe('LocationPicker', () => {
  it('stores location list for display', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');
    expect(picker.items).toHaveLength(3);
    expect(picker.items[0].id).toBe('entrance');
    expect(picker.items[0].name).toBe('Entrance');
  });

  it('resolves thumbnail URLs', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');
    expect(picker.items[0].thumbnailUrl).toBe('https://cdn.test/thumbnails/entrance-thumb.jpg');
    expect(picker.items[1].thumbnailUrl).toBeNull();
  });

  it('tracks current location', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');
    picker.setCurrentLocation('lobby');
    expect(picker.currentLocationId).toBe('lobby');
  });

  it('filters out current location from selectable items', () => {
    const picker = new LocationPicker();
    picker.setLocations(LOCATIONS, 'https://cdn.test');
    picker.setCurrentLocation('lobby');
    const selectable = picker.getSelectableItems();
    expect(selectable).toHaveLength(2);
    expect(selectable.find(i => i.id === 'lobby')).toBeUndefined();
  });
});
