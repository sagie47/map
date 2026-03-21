import { BaseAdapter } from '../baseAdapter';
import { nwsNormalizer, NWSAlertFeature } from './nwsNormalizer';

export interface NWSConfig {
  enabled?: boolean;
  pollingInterval?: number;
}

export class NWSAdapter extends BaseAdapter {
  sourceName = 'nws';
  mode: 'streaming' | 'polling' = 'polling';
  
  private config: NWSConfig = {};
  private pollingInterval: number = 300000; // Default 5 minutes

  constructor(config: NWSConfig = {}) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 300000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[NWS] Starting weather alerts adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[NWS] Stopping weather alerts adapter`);
  }

  async poll(): Promise<void> {
    const url = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BeaconScope/1.0.0 (contact@example.com)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { features: NWSAlertFeature[] };
      
      if (!data.features) {
        return;
      }

      for (const feature of data.features) {
        if (!feature.geometry) continue;

        const normalized = nwsNormalizer.normalizeAlert(feature);
        if (normalized) {
          this.recordMessage();
          this.events.onAlert?.(normalized);
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
