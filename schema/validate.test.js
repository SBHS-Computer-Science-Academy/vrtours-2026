import { describe, it, expect } from 'vitest';
import { validateTourYaml, validateTourData } from './validate.js';

const VALID_TOUR = {
  name: 'Test Tour',
  description: 'A test tour',
  thumbnail: 'test-tour-thumb.jpg',
  startLocation: 'entrance',
  locations: [
    {
      id: 'entrance',
      name: 'Entrance',
      media: 'entrance.jpg',
      connections: ['lobby'],
      hotspots: [
        { target: 'lobby', yaw: 90, pitch: 0, label: 'To Lobby' }
      ],
      overlays: [
        { text: 'Welcome!', yaw: 180, pitch: 10 }
      ]
    },
    {
      id: 'lobby',
      name: 'Lobby',
      media: 'lobby.jpg',
      connections: ['entrance']
    }
  ]
};

describe('validateTourData', () => {
  it('accepts a valid tour', () => {
    const result = validateTourData(VALID_TOUR);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects tour missing required fields', () => {
    const result = validateTourData({ name: 'Incomplete' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects tour with invalid startLocation reference', () => {
    const tour = { ...VALID_TOUR, startLocation: 'nonexistent' };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('startLocation') })
    );
  });

  it('rejects tour with connection to nonexistent location', () => {
    const tour = {
      ...VALID_TOUR,
      locations: [
        { id: 'entrance', name: 'Entrance', media: 'entrance.jpg', connections: ['nonexistent'] }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('nonexistent') })
    );
  });

  it('rejects tour with hotspot targeting nonexistent location', () => {
    const tour = {
      ...VALID_TOUR,
      locations: [
        { id: 'entrance', name: 'Entrance', media: 'entrance.jpg', connections: [],
          hotspots: [{ target: 'ghost', yaw: 0, pitch: 0 }] }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('ghost') })
    );
  });

  it('rejects tour with duplicate location ids', () => {
    const tour = {
      ...VALID_TOUR,
      startLocation: 'entrance',
      locations: [
        { id: 'entrance', name: 'A', media: 'a.jpg', connections: [] },
        { id: 'entrance', name: 'B', media: 'b.jpg', connections: [] }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('duplicate') })
    );
  });

  it('rejects non-kebab-case media filename', () => {
    const tour = {
      ...VALID_TOUR,
      locations: [
        { id: 'entrance', name: 'Entrance', media: 'Main Entrance.jpg', connections: [] }
      ]
    };
    const result = validateTourData(tour);
    expect(result.valid).toBe(false);
  });
});
