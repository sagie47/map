export interface USGSProperties {
  mag: number;
  place: string;
  time: number;
  updated: number;
  url: string;
  detail: string;
  felt: number;
  cdi: number;
  mmi: number;
  alert: string;
  status: string;
  tsunami: number;
  sig: number;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number;
  dmin: number;
  rms: number;
  gap: number;
  magType: string;
  type: string;
  title: string;
}

export interface USGSFeature {
  type: 'Feature';
  properties: USGSProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number, number];
  };
  id: string;
}

export interface USGSGeoJSON {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    count: number;
  };
  features: USGSFeature[];
}

export interface USGSConfig {
  enabled?: boolean;
  pollingInterval?: number;
}
