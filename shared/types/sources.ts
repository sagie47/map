export interface VesselPositionDto {
  vesselId: string;
  mmsi: string;
  vesselName?: string;
  vesselType?: number;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  destination?: string;
  timestamp: string;
}

export interface AircraftPositionDto {
  aircraftId: string;
  icao24: string;
  callsign?: string;
  originCountry: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  onGround: boolean;
  timestamp: string;
}

export interface SatellitePositionDto {
  satelliteId: string;
  satelliteName: string;
  lat: number;
  lng: number;
  altitude: number;
  azimuth: number;
  elevation: number;
  range: number;
  timestamp: string;
}

export interface SatellitePassDto {
  satelliteId: string;
  satelliteName: string;
  startTime: string;
  endTime: string;
  maxElevation: number;
  duration: number;
}

export interface GroundAssetPositionDto {
  assetId: string;
  vehicleId: string;
  routeId: string;
  tripId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  stopId?: string;
  timestamp: string;
}

export interface RouteDeviationDto {
  assetId: string;
  vehicleId: string;
  routeId: string;
  deviationDistance: number;
  offRoute: boolean;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface SourceHealthDto {
  sourceName: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  messagesReceived: number;
}

export interface SourceHealthSummaryDto {
  totalSources: number;
  healthySources: number;
  degradedSources: number;
  failedSources: number;
  stoppedSources: number;
  sources: SourceHealthDto[];
}
