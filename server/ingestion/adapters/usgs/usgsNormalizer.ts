import { NormalizedAlert } from '../adapterInterface';
import { USGSFeature } from './usgsTypes';

export const usgsNormalizer = {
  normalizeAlert(feature: USGSFeature): NormalizedAlert | null {
    if (!feature.geometry?.coordinates) return null;

    const [lng, lat, depth] = feature.geometry.coordinates;
    const props = feature.properties;

    return {
      source: 'usgs',
      alertId: `earthquake-${feature.id}`,
      type: 'earthquake',
      severity: this.mapMagnitudeToSeverity(props.mag),
      certainty: 'observed',
      urgency: this.mapUrgency(props.mag),
      headline: props.title,
      description: this.buildDescription(props, depth),
      polygon: undefined,
      coordinates: [lng, lat],
      timestamp: new Date(props.time).toISOString(),
      expires: new Date(props.time + 86400000).toISOString()
    };
  },

  mapMagnitudeToSeverity(mag: number): string {
    if (mag >= 7) return 'critical';
    if (mag >= 5) return 'high';
    if (mag >= 3) return 'medium';
    return 'low';
  },

  mapUrgency(mag: number): string {
    return mag >= 5 ? 'expected' : 'future';
  },

  buildDescription(props: { place: string; mag: number; magType: string; felt: number; tsunami: number }, depth: number): string {
    const parts: string[] = [];
    if (props.place) parts.push(`Location: ${props.place}`);
    parts.push(`Depth: ${depth}km`);
    parts.push(`Magnitude: ${props.mag} (${props.magType})`);
    if (props.felt > 0) parts.push(`Felt: ${props.felt} reports`);
    if (props.tsunami === 1) parts.push('TSUNAMI WARNING');
    return parts.join(' | ');
  }
};
