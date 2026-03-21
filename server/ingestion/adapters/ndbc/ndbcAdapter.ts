import { BaseAdapter } from '../baseAdapter';
import { ndbcNormalizer } from './ndbcNormalizer';
import { NDBCConfig } from './ndbcTypes';

const NDBC_STATION_LIST_URL = 'https://www.ndbc.noaa.gov/data/realtime2/stations.txt';
const FETCH_TIMEOUT_MS = 10000;
const MAX_STATIONS_PER_POLL = 10;

export class NDBCAdapter extends BaseAdapter {
  sourceName = 'ndbc';
  mode: 'polling' = 'polling';

  private config: NDBCConfig = {};
  private pollingInterval: number = 60000;
  private stationIds: string[] = [];
  private stationCoordinates: Map<string, { lat: number; lng: number }> = new Map();
  private lastObservationByStation: Map<string, number> = new Map();

  constructor(config: NDBCConfig = {}) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 60000;
    this.stationIds = config.stationIds || [];
  }

  protected async doStart(): Promise<void> {
    console.log(`[NDBC] Starting buoy adapter with interval ${this.pollingInterval}ms`);
    if (this.stationIds.length === 0) {
      console.log('[NDBC] No station IDs configured, fetching station list...');
      await this.fetchStationList();
    }
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[NDBC] Stopping buoy adapter`);
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

  private async fetchStationList(): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(NDBC_STATION_LIST_URL);
      if (!response.ok) {
        this.recordFailure(`Station list fetch failed: ${response.status}`);
        return;
      }

      const text = await response.text();
      const lines = text.split('\n');
      const ids: string[] = [];

      for (const line of lines) {
        if (line.match(/^\d{5}\s/)) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const lat = parseFloat(parts[1]);
            const lng = parseFloat(parts[2]);
            if (this.config.boundingBox) {
              if (lat >= this.config.boundingBox.latMin && lat <= this.config.boundingBox.latMax &&
                  lng >= this.config.boundingBox.lngMin && lng <= this.config.boundingBox.lngMax) {
                ids.push(parts[0]);
                this.stationCoordinates.set(parts[0], { lat, lng });
              }
            } else {
              ids.push(parts[0]);
              this.stationCoordinates.set(parts[0], { lat, lng });
            }
          }
        }
      }

      this.stationIds = ids.slice(0, 100);
      console.log(`[NDBC] Found ${this.stationIds.length} stations in bounding box`);
      this.recordSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recordFailure(message);
      console.log(`[NDBC] Failed to fetch station list: ${message}`);
    }
  }

  async poll(): Promise<void> {
    if (this.stationIds.length === 0) {
      await this.fetchStationList();
      if (this.stationIds.length === 0) {
        this.recordSuccess();
        return;
      }
    }

    const stationsToFetch = this.stationIds.slice(0, MAX_STATIONS_PER_POLL);
    let fetchErrors = 0;

    for (const stationId of stationsToFetch) {
      try {
        await this.fetchStationData(stationId);
      } catch (error) {
        fetchErrors++;
      }
    }

    if (fetchErrors > 0) {
      this.recordFailure(`${fetchErrors}/${stationsToFetch.length} stations failed`);
    } else {
      this.recordSuccess();
    }
  }

  private async fetchStationData(stationId: string): Promise<void> {
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`;

    const response = await this.fetchWithTimeout(url);
    if (!response.ok) return;

    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length < 2) return;

    const observation = ndbcNormalizer.parseTextRow(stationId, lines);
    if (!observation) return;
    const stationCoord = this.stationCoordinates.get(stationId);
    if (stationCoord && observation.lat === 0 && observation.lng === 0) {
      observation.lat = stationCoord.lat;
      observation.lng = stationCoord.lng;
    }

    if (!ndbcNormalizer.isInBoundingBox(observation, this.config.boundingBox)) {
      return;
    }

    if (isNaN(observation.timestamp.getTime())) return;
    const observationTime = observation.timestamp.getTime();
    const lastSeen = this.lastObservationByStation.get(stationId);
    if (lastSeen !== undefined && lastSeen >= observationTime) {
      return;
    }
    this.lastObservationByStation.set(stationId, observationTime);

    const normalized = ndbcNormalizer.normalizeObservation(observation);
    if (normalized) {
      this.recordMessage();
      this.events.onPositionUpdate?.(normalized);
    }
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }
}
