import { NormalizedPositionUpdate } from '../adapterInterface';
import { OpenSkyStateVector } from './openSkyTypes';

export class OpenSkyNormalizer {
  private staleThresholdMs = 300000; // 5 minutes

  normalizeStateVector(vector: OpenSkyStateVector): NormalizedPositionUpdate | null {
    if (vector.latitude === null || vector.longitude === null) {
      return null;
    }

    return {
      source: 'opensky',
      assetId: vector.icao24,
      assetType: 'aircraft',
      lat: vector.latitude,
      lng: vector.longitude,
      heading: vector.true_track ?? undefined,
      speed: vector.velocity ?? undefined,
      altitude: vector.baro_altitude ?? undefined,
      timestamp: vector.time_position 
        ? new Date(vector.time_position * 1000).toISOString()
        : new Date(vector.last_contact * 1000).toISOString(),
      metadata: {
        callsign: vector.callsign,
        originCountry: vector.origin_country,
        onGround: vector.on_ground,
        verticalRate: vector.vertical_rate,
        geoAltitude: vector.geo_altitude,
        squawk: vector.squawk,
        lastContact: vector.last_contact
      }
    };
  }

  isStale(vector: OpenSkyStateVector): boolean {
    const lastContactTime = vector.last_contact * 1000;
    const now = Date.now();
    return (now - lastContactTime) > this.staleThresholdMs;
  }

  isInBoundingBox(
    vector: OpenSkyStateVector, 
    bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }
  ): boolean {
    if (vector.latitude === null || vector.longitude === null) {
      return false;
    }

    return vector.latitude >= bbox.latMin && 
           vector.latitude <= bbox.latMax && 
           vector.longitude >= bbox.lngMin && 
           vector.longitude <= bbox.lngMax;
  }

  getLastKnownPosition(vector: OpenSkyStateVector): { lat: number; lng: number } | null {
    if (vector.latitude === null || vector.longitude === null) {
      return null;
    }
    return { lat: vector.latitude, lng: vector.longitude };
  }

  setStaleThreshold(ms: number) {
    this.staleThresholdMs = ms;
  }
}

export const openSkyNormalizer = new OpenSkyNormalizer();
