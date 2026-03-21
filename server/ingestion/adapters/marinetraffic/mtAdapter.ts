import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents } from '../adapterInterface';
import { mtNormalizer } from './mtNormalizer';
import { MarineTrafficConfig, MTVesselPosition } from './mtTypes';

export class MarineTrafficAdapter extends BaseAdapter {
  sourceName = 'marinetraffic';
  mode: 'streaming' | 'polling' = 'polling';

  private config: MarineTrafficConfig;
  private pollingInterval: number = 60000;

  constructor(config: MarineTrafficConfig) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 60000;
  }

  protected async doStart(): Promise<void> {
    if (!this.config.apiKey) {
      console.log(`[MarineTraffic] No API key configured, adapter will not fetch data`);
      this.recordSuccess();
      return;
    }
    console.log(`[MarineTraffic] Starting polling adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[MarineTraffic] Stopping polling adapter`);
  }

  async poll(): Promise<void> {
    if (!this.config.apiKey) {
      return;
    }

    const bbox = this.config.boundingBox;
    const url = this.buildUrl(bbox);

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`MarineTraffic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data: MTVesselPosition[] };

      if (!data.data || !Array.isArray(data.data)) {
        return;
      }

      for (const vessel of data.data) {
        if (bbox && !mtNormalizer.isInBoundingBox(vessel, bbox)) {
          continue;
        }

        const normalized = mtNormalizer.normalizePosition(vessel);
        if (normalized) {
          this.recordMessage();
          this.events.onPositionUpdate?.(normalized);
        }
      }

      this.recordSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recordFailure(message);
      this.emitError(error instanceof Error ? error : new Error(message));
    }
  }

  private buildUrl(bbox?: { latMin: number; latMax: number; lngMin: number; lngMax: number }): string {
    const baseUrl = 'https://www.marinetraffic.com/api/v6/voyages';

    if (!bbox) {
      return `${baseUrl}?protocol=json&api_key=${this.config.apiKey}`;
    }

    const params = new URLSearchParams({
      protocol: 'json',
      api_key: this.config.apiKey,
      bbox: `${bbox.lngMin},${bbox.latMin},${bbox.lngMax},${bbox.latMax}`
    });

    return `${baseUrl}?${params.toString()}`;
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }
}
