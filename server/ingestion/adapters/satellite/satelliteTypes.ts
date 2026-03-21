export interface SatelliteTLE {
  name: string;
  line1: string;
  line2: string;
}

export interface SatellitePosition {
  satname: string;
  satid: number;
  transactionsize: number;
  jd: number;
  date: string;
  raz: number;
  razdot: number;
  el: number;
  az: number;
  azdot: number;
  ra: number;
  decl: number;
  azoff: number;
  eloff: number;
  range: number;
  rangev: number;
  elevation: number;
  lat: number;
  lon: number;
  alt: number;
  phase: number;
}

export interface SatellitePass {
  satelliteId: string;
  satelliteName: string;
  startAzimuth: number;
  startElevation: number;
  startTime: string;
  maxAzimuth: number;
  maxElevation: number;
  maxTime: string;
  endAzimuth: number;
  endElevation: number;
  endTime: string;
  duration: number;
}

export type SatelliteProvider = 'n2yo' | 'space-track' | 'celestrak';

export interface SatelliteConfig {
  provider: SatelliteProvider;
  apiKey?: string;
  satelliteIds?: string[];
  pollingInterval?: number;
  celestrakGroups?: string[];
}
