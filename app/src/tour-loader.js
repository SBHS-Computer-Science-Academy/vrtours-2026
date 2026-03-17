/**
 * TourLoader — parses tour JSON data, builds a location index,
 * and resolves media URLs. No Babylon.js dependency.
 *
 * The Scene Manager requests media through TourLoader, passing the
 * desired resolution tier; TourLoader handles all path assembly.
 */
export class TourLoader {
  /** @param {{ mediaBaseUrl: string }} config */
  constructor(config) {
    this._mediaBaseUrl = config.mediaBaseUrl;
    this._tour = null;
    this._locationMap = new Map();
  }

  /** Load and validate tour data (already parsed from JSON). Throws on invalid references. */
  loadTour(data) {
    this._locationMap.clear();
    for (const loc of data.locations) {
      this._locationMap.set(loc.id, loc);
    }

    if (!this._locationMap.has(data.startLocation)) {
      throw new Error(`startLocation "${data.startLocation}" does not match any location id`);
    }

    for (const loc of data.locations) {
      for (const conn of loc.connections) {
        if (!this._locationMap.has(conn)) {
          throw new Error(`Location "${loc.id}" has connection to unknown location "${conn}"`);
        }
      }
      if (loc.hotspots) {
        for (const hs of loc.hotspots) {
          if (!this._locationMap.has(hs.target)) {
            throw new Error(`Location "${loc.id}" has hotspot targeting unknown location "${hs.target}"`);
          }
        }
      }
    }

    this._tour = data;
  }

  get tourName() { return this._tour?.name ?? null; }
  get startLocationId() { return this._tour?.startLocation ?? null; }
  get locationIds() { return this._tour ? this._tour.locations.map(l => l.id) : []; }

  /** Get a location by id, or null if not found. */
  getLocation(id) { return this._locationMap.get(id) ?? null; }

  /** Get all locations in tour order. */
  getAllLocations() { return this._tour ? [...this._tour.locations] : []; }

  /**
   * Resolve a media filename + resolution tier to a full photo URL.
   * e.g. ("entrance.jpg", "4k") → "https://…/360-photos/entrance-4k.jpg"
   */
  resolvePhotoUrl(filename, resolution) {
    const base = filename.replace(/\.jpg$/, '');
    return `${this._mediaBaseUrl}/360-photos/${base}-${resolution}.jpg`;
  }

  /** Resolve a thumbnail filename to a full URL. */
  resolveThumbnailUrl(filename) {
    return `${this._mediaBaseUrl}/thumbnails/${filename}`;
  }
}
