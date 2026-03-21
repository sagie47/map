import { NormalizedPositionUpdate } from '../adapterInterface';
import { MTVesselPosition, MTVesselDetails } from './mtTypes';

export class MTNormalizer {
  normalizePosition(vessel: MTVesselPosition): NormalizedPositionUpdate | null {
    if (vessel.LAT === undefined || vessel.LON === undefined) {
      return null;
    }

    return {
      source: 'marinetraffic',
      assetId: vessel.MMSI?.toString() || vessel.IMO?.toString(),
      assetType: 'vessel',
      lat: vessel.LAT,
      lng: vessel.LON,
      heading: vessel.HEADING,
      speed: vessel.SPEED,
      timestamp: vessel.TIMESTAMP || new Date().toISOString(),
      metadata: {
        vesselName: vessel.NAME?.trim(),
        vesselType: vessel.VESSEL_TYPE,
        vesselTypeCode: vessel.VESSEL_TYPE_CODE,
        callsign: vessel.CALLSIGN,
        flag: vessel.FLAG,
        destination: vessel.DESTINATION,
        eta: vessel.ETA,
        courseOverGround: vessel.COURSE,
        length: vessel.LENGTH,
        width: vessel.WIDTH,
        status: vessel.STATUS,
        imo: vessel.IMO,
        lastPort: vessel.LAST_PORT,
        lastPortTime: vessel.LAST_PORT_TIME,
        nextPort: vessel.NEXT_PORT,
        nextPortEta: vessel.NEXT_PORT_ETA
      }
    };
  }

  normalizeVesselDetails(details: MTVesselDetails): Record<string, unknown> {
    return {
      imo: details.IMO,
      mmsi: details.MMSI,
      vesselName: details.NAME?.trim(),
      callsign: details.CALLSIGN,
      vesselType: details.VESSEL_TYPE,
      vesselTypeCode: details.VESSEL_TYPE_CODE,
      length: details.LENGTH,
      width: details.WIDTH,
      draught: details.DRAUGHT,
      grossTonnage: details.GT,
      netTonnage: details.NT,
      flag: details.FLAG,
      yearBuilt: details.BUILT,
      owner: details.OWNER,
      class: details.CLASS
    };
  }

  isValidPosition(vessel: MTVesselPosition): boolean {
    return vessel.LAT !== undefined &&
           vessel.LON !== undefined &&
           vessel.LAT >= -90 && vessel.LAT <= 90 &&
           vessel.LON >= -180 && vessel.LON <= 180;
  }

  isInBoundingBox(vessel: MTVesselPosition, bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }): boolean {
    if (vessel.LAT === undefined || vessel.LON === undefined) return false;
    
    return vessel.LAT >= bbox.latMin && vessel.LAT <= bbox.latMax &&
           vessel.LON >= bbox.lngMin && vessel.LON <= bbox.lngMax;
  }
}

export const mtNormalizer = new MTNormalizer();
