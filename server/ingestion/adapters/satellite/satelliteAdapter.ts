import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents } from '../adapterInterface';
import { satelliteNormalizer } from './satelliteNormalizer';
import { SatellitePosition, SatelliteConfig } from './satelliteTypes';

export class SatelliteAdapter extends BaseAdapter {
  sourceName = 'satellite';
  mode: 'streaming' | 'polling' = 'polling';
  
  private config: SatelliteConfig = { provider: 'n2yo' };
  private pollingInterval: number = 300000; // Default 5 minutes

  constructor(config: SatelliteConfig = { provider: 'n2yo' }) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 300000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[Satellite] Starting polling adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[Satellite] Stopping polling adapter`);
  }

  async pollPositions(): Promise<void> {
    if (!this.config.apiKey || !this.config.satelliteIds?.length) {
      console.log(`[Satellite] No API key or satellite IDs configured`);
      this.recordSuccess();
      return;
    }

    try {
      for (const satId of this.config.satelliteIds) {
        await this.fetchSatellitePosition(satId);
      }
      this.recordSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recordFailure(message);
      this.emitError(error instanceof Error ? error : new Error(message));
    }
  }

  private async fetchSatellitePosition(satId: string): Promise<void> {
    const url = this.buildPositionUrl(satId);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Satellite API error: ${response.status}`);
    }

    const data = await response.json() as SatellitePosition;
    
    const normalized = satelliteNormalizer.normalizePosition(data);
    if (normalized) {
      this.recordMessage();
      this.events.onPositionUpdate?.(normalized);

      if (satelliteNormalizer.isVisible(data)) {
        const coverage = satelliteNormalizer.calculateCoverageArea(
          normalized.lat,
          normalized.lng,
          normalized.altitude || 0,
          (normalized.metadata?.range as number) || 1000
        );

        this.events.onCoverageEvent?.({
          source: 'satellite',
          eventType: 'coverage_available',
          satelliteId: satId,
          coverageArea: coverage,
          timestamp: normalized.timestamp
        });
      }
    }
  }

  private buildPositionUrl(satId: string): string {
    const baseUrl = `https://api.n2yo.com/rest/v1/satellite/positions/${satId}`;
    const params = new URLSearchParams({
      apiKey: this.config.apiKey || '',
      observerLat: '0',
      observerLng: '0',
      observerAlt: '0',
      secs: '1'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }

  simulatePosition(position: SatellitePosition) {
    const normalized = satelliteNormalizer.normalizePosition(position);
    if (normalized) {
      this.recordMessage();
      this.events.onPositionUpdate?.(normalized);
    }
  }
}
