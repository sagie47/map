export type AdapterMode = 'streaming' | 'polling';

export type AdapterStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface AdapterHealth {
  sourceName: string;
  status: AdapterStatus;
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  messagesReceived: number;
}

export interface AdapterEvents {
  onDetection?: (detection: NormalizedDetection) => void;
  onPositionUpdate?: (update: NormalizedPositionUpdate) => void;
  onHeartbeat?: (heartbeat: NormalizedHeartbeat) => void;
  onCoverageEvent?: (event: NormalizedCoverageEvent) => void;
  onSourceError?: (error: AdapterError) => void;
}

export interface AdapterError {
  source: string;
  message: string;
  timestamp: string;
  recoverable: boolean;
}

export interface NormalizedDetection {
  source: string;
  beaconId: string;
  domainType: 'marine' | 'aviation' | 'personal' | 'ground';
  lat: number;
  lng: number;
  signalStrength?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface NormalizedPositionUpdate {
  source: string;
  assetId: string;
  assetType: 'vessel' | 'aircraft' | 'satellite' | 'ground';
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedHeartbeat {
  source: string;
  receiverId: string;
  status: 'online' | 'degraded' | 'offline';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedCoverageEvent {
  source: string;
  eventType: 'pass_start' | 'pass_end' | 'coverage_available';
  satelliteId: string;
  coverageArea?: { lat: number; lng: number; radius: number };
  windowStart?: string;
  windowEnd?: string;
  timestamp: string;
}

export interface NormalizedRouteDeviation {
  source: string;
  assetId: string;
  routeId: string;
  deviationDistance: number;
  offRoute: boolean;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface Adapter {
  sourceName: string;
  mode: AdapterMode;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): AdapterHealth;
}

export interface AdapterConfig {
  enabled: boolean;
  pollingInterval?: number;
  region?: { latMin: number; latMax: number; lngMin: number; lngMax: number };
  credentials?: Record<string, string>;
}

export type NormalizedEvent = 
  | NormalizedDetection 
  | NormalizedPositionUpdate 
  | NormalizedHeartbeat 
  | NormalizedCoverageEvent
  | NormalizedRouteDeviation;
