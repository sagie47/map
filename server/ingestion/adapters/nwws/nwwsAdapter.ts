import { BaseAdapter } from '../baseAdapter';
import { nwwsNormalizer } from './nwwsNormalizer';
import { NWWSConfig, NWWSCapAlert } from './nwwsTypes';

const NWWS_CAP_URL = 'https://www.nws.noaa.gov/alerts/wwas/get.php?a=ALL&mode=json';
const FETCH_TIMEOUT_MS = 15000;

export class NWWSAdapter extends BaseAdapter {
  sourceName = 'nwws';
  mode: 'polling' = 'polling';

  private config: NWWSConfig = {};
  private pollingInterval: number = 60000;
  private lastFetchTime: number = Date.now();
  private processedAlertIds: Set<string> = new Set();
  private readonly MAX_PROCESSED_IDS = 1000;

  constructor(config: NWWSConfig = {}) {
    super();
    this.config = {
      fallbackMode: true,
      pollingInterval: 60000,
      ...config
    };
    this.pollingInterval = this.config.pollingInterval || 60000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[NWWS] Starting NWWS adapter (fallback mode: ${this.config.fallbackMode}) with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[NWWS] Stopping NWWS adapter`);
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BeaconScope/1.0',
          'Accept': 'application/json'
        }
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async poll(): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(NWWS_CAP_URL);

      if (!response.ok) {
        throw new Error(`NWWS CAP API error: ${response.status}`);
      }

      const data = await response.json() as NWWSCapAlert[];

      for (const alert of data) {
        if (!alert.entries) continue;

        for (const entry of alert.entries) {
          if (!entry.updated || !entry.id) continue;

          if (this.processedAlertIds.has(entry.id)) continue;

          const entryTime = new Date(entry.updated).getTime();
          if (entryTime <= this.lastFetchTime) continue;

          const normalized = nwwsNormalizer.normalizeCapEntry(entry, `nwws-${Date.now()}`);
          if (normalized) {
            this.recordMessage();
            this.events.onAlert?.(normalized);
            this.processedAlertIds.add(entry.id);
            
            if (this.processedAlertIds.size > this.MAX_PROCESSED_IDS) {
              const toDelete = this.processedAlertIds.size - this.MAX_PROCESSED_IDS;
              const iter = this.processedAlertIds.values();
              for (let i = 0; i < toDelete; i++) {
                this.processedAlertIds.delete(iter.next().value);
              }
            }
          }
        }
      }

      this.lastFetchTime = Date.now();
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
