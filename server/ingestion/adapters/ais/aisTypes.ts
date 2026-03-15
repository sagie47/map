export interface AISMessage {
  type: number;
  mmsi: string;
  lat?: number;
  lon?: number;
  sog?: number;
  cog?: number;
  heading?: number;
  timestamp?: string;
  name?: string;
  destination?: string;
  vesselType?: number;
  status?: number;
}

export interface AISShipPosition {
  mmsi: string;
  latitude: number;
  longitude: number;
  speedOverGround: number;
  courseOverGround: number;
  trueHeading: number;
  timestamp: string;
  vesselName?: string;
  vesselType?: number;
  destination?: string;
  status?: number;
}

export interface AISConfig {
  streamingUrl?: string;
  apiKey?: string;
  boundingBox?: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
  filterVesselTypes?: number[];
}
