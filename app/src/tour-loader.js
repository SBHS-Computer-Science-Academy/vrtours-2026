export class TourLoader {
  constructor(config) {
    this._mediaBaseUrl = config.mediaBaseUrl;
    this._tour = null;
    this._locationMap = new Map();
  }

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

  getLocation(id) { return this._locationMap.get(id) ?? null; }
  getAllLocations() { return this._tour ? [...this._tour.locations] : []; }

  resolvePhotoUrl(filename, resolution) {
    const base = filename.replace(/\.jpg$/, '');
    return `${this._mediaBaseUrl}/360-photos/${base}-${resolution}.jpg`;
  }

  resolveThumbnailUrl(filename) {
    return `${this._mediaBaseUrl}/thumbnails/${filename}`;
  }
}
