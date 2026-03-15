import { NormalizedPositionUpdate, NormalizedCoverageEvent } from '../adapterInterface';
import { SatellitePosition, SatellitePass } from './satelliteTypes';

export class SatelliteNormalizer {
  normalizePosition(position: SatellitePosition): NormalizedPositionUpdate | null {
    if (position.lat === undefined || position.lon === undefined) {
      return null;
    }

    return {
      source: 'satellite',
      assetId: String(position.satid),
      assetType: 'satellite',
      lat: position.lat,
      lng: position.lon,
      altitude: position.alt,
      timestamp: new Date(position.jd * 1000).toISOString(),
      metadata: {
        satelliteName: position.satname,
        azimuth: position.az,
        elevation: position.elevation,
        range: position.range,
        rangeVelocity: position.rangev,
        phase: position.phase
      }
    };
  }

  normalizePass(pass: SatellitePass): NormalizedCoverageEvent {
    return {
      source: 'satellite',
      eventType: 'pass_start',
      satelliteId: pass.satelliteId,
      coverageArea: {
        lat: 0,
        lng: 0,
        radius: 1000
      },
      windowStart: pass.startTime,
      windowEnd: pass.endTime,
      timestamp: pass.startTime
    };
  }

  isVisible(position: SatellitePosition): boolean {
    return position.elevation > 0;
  }

  calculateCoverageArea(
    centerLat: number, 
    centerLng: number, 
    elevation: number, 
    range: number
  ): { lat: number; lng: number; radius: number } {
    const elevationKm = elevation * 1000;
    const earthRadiusKm = 6371;
    const horizonDistanceKm = Math.sqrt(
      Math.pow(earthRadiusKm + elevationKm, 2) - Math.pow(earthRadiusKm, 2)
    );
    
    return {
      lat: centerLat,
      lng: centerLng,
      radius: Math.min(horizonDistanceKm, range / 1000)
    };
  }
}

export const satelliteNormalizer = new SatelliteNormalizer();
