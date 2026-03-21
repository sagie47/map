import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents } from '../adapterInterface';
import { adsbNormalizer } from './adsbNormalizer';
import { ADSBAircraft, ADSBConfig } from './adsbTypes';

export class ADSBAdapter extends BaseAdapter {
  sourceName = 'adsb';
  mode: 'polling' = 'polling';
  
  private config: ADSBConfig = {};
  private pollingInterval: number = 60000;

  constructor(config: ADSBConfig = {}) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 60000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[ADSB] Starting polling adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[ADSB] Stopping polling adapter`);
  }

  async poll(): Promise<void> {
    const bbox = this.config.boundingBox;
    const url = this.buildUrl(bbox);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`ADSB Exchange API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { acList?: ADSBAircraft[] };
      
      if (!data.acList || data.acList.length === 0) {
        this.recordSuccess();
        return;
      }

      for (const aircraft of data.acList) {
        if (bbox && !adsbNormalizer.isInBoundingBox(aircraft, bbox)) {
          continue;
        }

        const normalized = adsbNormalizer.normalizeAircraft(aircraft);
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
    const baseUrl = 'https://public-api.adsbexchange.com/VirtualRadar/AircraftList.json';
    
    if (!bbox) {
      return baseUrl;
    }

    const params = new URLSearchParams({
      latMin: bbox.latMin.toString(),
      latMax: bbox.latMax.toString(),
      lngMin: bbox.lngMin.toString(),
      lngMax: bbox.lngMax.toString()
    });

    return `${baseUrl}?${params.toString()}`;
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }
}
