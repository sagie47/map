import { BaseAdapter } from '../baseAdapter';
import { usgsNormalizer } from './usgsNormalizer';
import { USGSFeature, USGSGeoJSON, USGSConfig } from './usgsTypes';

const USGS_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const FETCH_TIMEOUT_MS = 15000;

export class USGSAdapter extends BaseAdapter {
  sourceName = 'usgs';
  mode: 'polling' = 'polling';

  private config: USGSConfig = {};
  private pollingInterval: number = 60000;
  private lastSeenByEventId: Map<string, number> = new Map();
  private readonly maxTrackedEvents = 5000;

  constructor(config: USGSConfig = {}) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 60000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[USGS] Starting earthquake feed adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[USGS] Stopping earthquake feed adapter`);
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async poll(): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(USGS_FEED_URL);

      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as USGSGeoJSON;

      if (!data.features || data.features.length === 0) {
        this.recordSuccess();
        return;
      }

      let alertCount = 0;
      for (const feature of data.features) {
        if (feature.geometry?.coordinates?.length < 2) continue;
        const eventId = feature.id || feature.properties.code;
        const updatedAt = feature.properties.updated || feature.properties.time;
        const lastSeen = this.lastSeenByEventId.get(eventId);
        if (lastSeen !== undefined && lastSeen >= updatedAt) {
          continue;
        }
        
        const normalized = usgsNormalizer.normalizeAlert(feature);
        if (normalized) {
          this.recordMessage();
          this.events.onAlert?.(normalized);
          this.lastSeenByEventId.set(eventId, updatedAt);
          alertCount++;
        }
      }

      if (this.lastSeenByEventId.size > this.maxTrackedEvents) {
        const deleteCount = this.lastSeenByEventId.size - this.maxTrackedEvents;
        const iterator = this.lastSeenByEventId.keys();
        for (let i = 0; i < deleteCount; i++) {
          const key = iterator.next().value;
          if (!key) break;
          this.lastSeenByEventId.delete(key);
        }
      }

      this.recordSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recordFailure(message);
      this.emitError(error instanceof Error ? error : new Error(message));
    }
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }
}
