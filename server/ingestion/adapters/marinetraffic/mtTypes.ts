export interface MTVesselPosition {
  IMO: number;
  MMSI: number;
  NAME: string;
  CALLSIGN: string;
  VESSEL_TYPE: string;
  VESSEL_TYPE_CODE: number;
  LENGTH: number;
  WIDTH: number;
  FLAG: string;
  LAT: number;
  LON: number;
  SPEED: number;
  COURSE: number;
  HEADING: number;
  STATUS: string;
  TIMESTAMP: string;
  DESTINATION: string;
  ETA: string;
  LAST_PORT_ID: number;
  LAST_PORT: string;
  LAST_PORT_TIME: string;
  NEXT_PORT_ID: number;
  NEXT_PORT: string;
  NEXT_PORT_ETA: string;
}

export interface MTVesselDetails {
  IMO: number;
  MMSI: number;
  NAME: string;
  CALLSIGN: string;
  VESSEL_TYPE: string;
  VESSEL_TYPE_CODE: number;
  LENGTH: number;
  WIDTH: number;
  DRAUGHT: number;
  GT: number;
  NT: number;
  FLAG: string;
  BUILT: number;
  OWNER: string;
  CLASS: string;
}

export interface MTApiResponse {
  data: MTVesselPosition[] | MTVesselDetails[];
  error?: string;
  error_message?: string;
}

export interface MarineTrafficConfig {
  apiKey: string;
  boundingBox?: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
  pollingInterval?: number;
}
