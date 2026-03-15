import { NormalizedPositionUpdate, NormalizedDetection } from '../adapterInterface';
import { AISMessage, AISShipPosition } from './aisTypes';

export class AISNormalizer {
  normalizePosition(message: AISShipPosition): NormalizedPositionUpdate | null {
    if (message.latitude === undefined || message.longitude === undefined) {
      return null;
    }

    return {
      source: 'ais',
      assetId: message.mmsi,
      assetType: 'vessel',
      lat: message.latitude,
      lng: message.longitude,
      heading: message.trueHeading,
      speed: message.speedOverGround,
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: {
        vesselName: message.vesselName,
        vesselType: message.vesselType,
        destination: message.destination,
        courseOverGround: message.courseOverGround
      }
    };
  }

  normalizeMessage(message: AISMessage): NormalizedPositionUpdate | null {
    if (message.lat === undefined || message.lon === undefined) {
      return null;
    }

    return {
      source: 'ais',
      assetId: message.mmsi,
      assetType: 'vessel',
      lat: message.lat,
      lng: message.lon,
      heading: message.heading,
      speed: message.sog,
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: {
        vesselName: message.name,
        vesselType: message.vesselType,
        destination: message.destination,
        courseOverGround: message.cog,
        messageType: message.type
      }
    };
  }

  isValidPosition(message: AISMessage | AISShipPosition): boolean {
    if ('latitude' in message) {
      return message.latitude !== undefined && 
             message.longitude !== undefined &&
             message.latitude >= -90 && message.latitude <= 90 &&
             message.longitude >= -180 && message.longitude <= 180;
    }
    return message.lat !== undefined && 
           message.lon !== undefined &&
           message.lat >= -90 && message.lat <= 90 &&
           message.lon >= -180 && message.lon <= 180;
  }

  isInBoundingBox(message: AISMessage | AISShipPosition, bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }): boolean {
    const lat = 'latitude' in message ? message.latitude : message.lat;
    const lng = 'longitude' in message ? message.longitude : message.lon;
    
    if (lat === undefined || lng === undefined) return false;
    
    return lat >= bbox.latMin && lat <= bbox.latMax && 
           lng >= bbox.lngMin && lng <= bbox.lngMax;
  }

  filterVesselType(message: AISMessage | AISShipPosition, allowedTypes: number[]): boolean {
    const vesselType = 'vesselType' in message ? message.vesselType : message.vesselType;
    if (vesselType === undefined) return true;
    return allowedTypes.includes(vesselType);
  }
}

export const aisNormalizer = new AISNormalizer();
