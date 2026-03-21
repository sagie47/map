export interface NDBCObservation {
  stationId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  windSpeed: number;
  windDir: number;
  windGust: number;
  waveHeight: number;
  wavePeriod: number;
  waveDir: number;
  pressure: number;
  airTemp: number;
  waterTemp: number;
  visibility: number;
  dewPoint: number;
  salinity: number;
}

export interface NDBCTextRow {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  windSpeed: string;
  windDir: string;
  windGust: string;
  waveHeight: string;
  wavePeriod: string;
  waveDir: string;
  pressure: string;
  pressureTendency: string;
  airTemp: string;
  waterTemp: string;
  dewPoint: string;
  visibility: string;
  salinity: string;
}

export interface NDBCConfig {
  enabled?: boolean;
  pollingInterval?: number;
  stationIds?: string[];
  boundingBox?: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
}
