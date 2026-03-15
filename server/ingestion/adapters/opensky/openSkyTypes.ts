export interface OpenSkyStateVector {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
}

export interface OpenSkyResponse {
  time: number;
  states: OpenSkyStateVector[] | null;
}

export interface OpenSkyConfig {
  username?: string;
  password?: string;
  boundingBox?: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
  pollingInterval?: number;
}

export interface StaleTrackCandidate {
  icao24: string;
  callsign: string | null;
  lastContact: number;
  lastKnownLat: number;
  lastKnownLng: number;
}
