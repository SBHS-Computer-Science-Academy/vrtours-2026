import { describe, it, expect } from 'vitest';
import { TourLoader } from '../src/tour-loader.js';
import validTour from './fixtures/valid-tour.json';
import missingStart from './fixtures/invalid-tour-missing-start.json';
import badConnection from './fixtures/invalid-tour-bad-connection.json';

describe('TourLoader', () => {
  describe('loadTour', () => {
    it('loads and indexes a valid tour', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);
      expect(loader.tourName).toBe('Test Tour');
      expect(loader.startLocationId).toBe('entrance');
      expect(loader.locationIds).toEqual(['entrance', 'lobby']);
    });

    it('throws on missing startLocation reference', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      expect(() => loader.loadTour(missingStart)).toThrow('startLocation');
    });

    it('throws on invalid connection reference', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      expect(() => loader.loadTour(badConnection)).toThrow('ghost');
    });
  });

  describe('getLocation', () => {
    it('returns location data by id', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);
      const loc = loader.getLocation('entrance');
      expect(loc.name).toBe('Entrance');
      expect(loc.connections).toEqual(['lobby']);
    });

    it('returns null for unknown id', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);
      expect(loader.getLocation('nonexistent')).toBeNull();
    });
  });

  describe('resolvePhotoUrl', () => {
    it('resolves media filename to full URL with resolution', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);
      expect(loader.resolvePhotoUrl('entrance.jpg', '4k'))
        .toBe('https://cdn.test/360-photos/entrance-4k.jpg');
    });
  });

  describe('resolveThumbnailUrl', () => {
    it('resolves thumbnail filename to full URL', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);
      expect(loader.resolveThumbnailUrl('entrance-thumb.jpg'))
        .toBe('https://cdn.test/thumbnails/entrance-thumb.jpg');
    });
  });

  describe('getAllLocations', () => {
    it('returns all locations in order', () => {
      const loader = new TourLoader({ mediaBaseUrl: 'https://cdn.test' });
      loader.loadTour(validTour);
      const all = loader.getAllLocations();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('entrance');
      expect(all[1].id).toBe('lobby');
    });
  });
});
