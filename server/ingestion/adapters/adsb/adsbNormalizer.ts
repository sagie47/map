import { NormalizedPositionUpdate } from '../adapterInterface';
import { ADSBAircraft } from './adsbTypes';

export class ADSBNormalizer {
  normalizeAircraft(aircraft: ADSBAircraft): NormalizedPositionUpdate | null {
    if (aircraft.Lat === null || aircraft.Lat === undefined || 
        aircraft.Long === null || aircraft.Long === undefined) {
      return null;
    }

    return {
      source: 'adsb',
      assetId: aircraft.Icao,
      assetType: 'aircraft',
      lat: aircraft.Lat,
      lng: aircraft.Long,
      heading: aircraft.Trak ?? aircraft.Hdg ?? undefined,
      speed: aircraft.Spd ?? undefined,
      altitude: aircraft.Alt ?? undefined,
      timestamp: aircraft.Pos ? new Date(aircraft.Pos * 1000).toISOString() : new Date().toISOString(),
      metadata: {
        callsign: aircraft.Call || undefined,
        originCountry: aircraft.Cou || aircraft.Country || undefined,
        onGround: aircraft.Gnd,
        geoAltitude: aircraft.GAlt ?? undefined,
        squawk: aircraft.Sqk || undefined,
        verticalRate: aircraft.VS ?? undefined,
        aircraftType: aircraft.Desc || undefined,
        registration: aircraft.Reg || undefined,
        operator: aircraft.Op || undefined,
        operatorIcao: aircraft.OpIcao || undefined,
        species: aircraft.Species ?? undefined,
        engineType: aircraft.EngType ?? undefined
      }
    };
  }

  isInBoundingBox(
    aircraft: ADSBAircraft,
    bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }
  ): boolean {
    if (aircraft.Lat === null || aircraft.Lat === undefined || 
        aircraft.Long === null || aircraft.Long === undefined) {
      return false;
    }

    return aircraft.Lat >= bbox.latMin && 
           aircraft.Lat <= bbox.latMax && 
           aircraft.Long >= bbox.lngMin && 
           aircraft.Long <= bbox.lngMax;
  }

  getLastKnownPosition(aircraft: ADSBAircraft): { lat: number; lng: number } | null {
    if (aircraft.Lat === null || aircraft.Lat === undefined || 
        aircraft.Long === null || aircraft.Long === undefined) {
      return null;
    }
    return { lat: aircraft.Lat, lng: aircraft.Long };
  }
}

export const adsbNormalizer = new ADSBNormalizer();
