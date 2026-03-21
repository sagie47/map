import { NormalizedPositionUpdate } from '../adapterInterface';
import { WindyObservation, WindyWindUpdate } from './windyTypes';

export class WindyNormalizer {
  normalizeWindUpdate(observation: WindyObservation): NormalizedPositionUpdate | null {
    if (observation.lat === undefined || observation.lon === undefined) {
      return null;
    }

    if (observation.measurements.windSpeed === undefined && observation.measurements.windDirection === undefined) {
      return null;
    }

    return {
      source: 'windy',
      assetId: observation.station?.id || observation.id,
      assetType: 'ground',
      lat: observation.lat,
      lng: observation.lon,
      timestamp: observation.timestamp || new Date().toISOString(),
      metadata: {
        windSpeed: observation.measurements.windSpeed,
        windDirection: observation.measurements.windDirection,
        windGust: observation.measurements.windGust,
        temperature: observation.measurements.temperature,
        pressure: observation.measurements.pressure,
        humidity: observation.measurements.humidity,
        stationName: observation.station?.name,
        stationId: observation.station?.id
      }
    };
  }

  isValidObservation(observation: WindyObservation): boolean {
    return observation.lat !== undefined &&
           observation.lon !== undefined &&
           observation.lat >= -90 && observation.lat <= 90 &&
           observation.lon >= -180 && observation.lon <= 180;
  }

  isInBoundingBox(
    observation: WindyObservation,
    bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }
  ): boolean {
    if (observation.lat === undefined || observation.lon === undefined) {
      return false;
    }
    return observation.lat >= bbox.latMin &&
           observation.lat <= bbox.latMax &&
           observation.lon >= bbox.lngMin &&
           observation.lon <= bbox.lngMax;
  }
}

export const windyNormalizer = new WindyNormalizer();
