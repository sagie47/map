import { NormalizedAlert } from '../adapterInterface';

export interface NWSAlertFeature {
  id: string;
  properties: {
    id: string;
    event: string;
    severity: string;
    certainty: string;
    urgency: string;
    headline: string;
    description: string;
    sent: string;
    expires: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  } | null;
}

export const nwsNormalizer = {
  normalizeAlert(feature: NWSAlertFeature): NormalizedAlert {
    let polygon: number[][][] | undefined = undefined;

    if (feature.geometry) {
      if (feature.geometry.type === 'Polygon') {
        polygon = feature.geometry.coordinates; // [ [ [lng, lat], ... ] ]
      } else if (feature.geometry.type === 'MultiPolygon') {
        const coords = feature.geometry.coordinates as number[][][][];
        // Take the first polygon for simplicity, or handle multi-polygons fully
        // Mapbox supports MultiPolygon, but our simplified interface takes Polygon array of rings.
        polygon = coords[0];
      }
    }

    return {
      source: 'nws',
      alertId: feature.properties.id || feature.id,
      type: feature.properties.event,
      severity: feature.properties.severity,
      certainty: feature.properties.certainty,
      urgency: feature.properties.urgency,
      headline: feature.properties.headline || '',
      description: feature.properties.description || '',
      polygon,
      timestamp: feature.properties.sent,
      expires: feature.properties.expires
    };
  }
};
