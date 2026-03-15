import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents } from '../adapterInterface';
import { gtfsNormalizer } from './gtfsNormalizer';
import { GTFSVehiclePosition, GTFSConfig } from './gtfsTypes';

export class GTFSAdapter extends BaseAdapter {
  sourceName = 'gtfs';
  mode: 'streaming' | 'polling' = 'polling';
  
  private config: GTFSConfig = { feedUrl: '' };
  private pollingInterval: number = 30000; // Default 30 seconds

  constructor(config: GTFSConfig = { feedUrl: '' }) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 30000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[GTFS] Starting polling adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[GTFS] Stopping polling adapter`);
  }

  async poll(): Promise<void> {
    if (!this.config.feedUrl) {
      console.log(`[GTFS] No feed URL configured`);
      this.recordSuccess();
      return;
    }

    try {
      const response = await fetch(this.config.feedUrl);
      
      if (!response.ok) {
        throw new Error(`GTFS feed error: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const data = this.parseGTFSRealtime(buffer);
      
      for (const vehicle of data) {
        if (this.config.routeIds?.length && vehicle.trip?.routeId) {
          if (!this.config.routeIds.includes(vehicle.trip.routeId)) {
            continue;
          }
        }

        const normalized = gtfsNormalizer.normalizeVehiclePosition(vehicle);
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

  private parseGTFSRealtime(buffer: ArrayBuffer): GTFSVehiclePosition[] {
    try {
      const uint8Array = new Uint8Array(buffer);
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(uint8Array);
      
      const data = JSON.parse(text);
      return data.entity?.map((e: any) => e.vehicle).filter(Boolean) || [];
    } catch {
      return [];
    }
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }

  simulateVehiclePosition(vehicle: GTFSVehiclePosition) {
    const normalized = gtfsNormalizer.normalizeVehiclePosition(vehicle);
    if (normalized) {
      this.recordMessage();
      this.events.onPositionUpdate?.(normalized);
    }
  }
}
