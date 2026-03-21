export interface WindyObservation {
  type: 'observation';
  id: string;
  lat: number;
  lon: number;
  timestamp: string;
  measurements: {
    windSpeed?: number;
    windDirection?: number;
    windGust?: number;
    temperature?: number;
    pressure?: number;
    humidity?: number;
  };
  station?: {
    id: string;
    name?: string;
  };
}

export interface WindyWindUpdate {
  source: 'windy';
  assetId: string;
  lat: number;
  lng: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface WindyConfig {
  enabled?: boolean;
  apiKey?: string;
  streamingUrl?: string;
  boundingBox?: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
  pollingInterval?: number;
}
