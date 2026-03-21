import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents } from '../adapterInterface';
import * as satellite from 'satellite.js';

export interface CelesTrakConfig {
  groups: CelesTrakGroup[];
  pollingInterval?: number;
}

export type CelesTrakGroup = 
  | 'stations'       // Space stations (ISS, Tiangong)
  | 'visual'         // Bright visible satellites
  | 'active'         // All active satellites
  | 'starlink'       // Starlink constellation
  | 'planet'         // Planet Labs satellites
  | 'gps-ops'        // GPS constellation
  | 'glo-ops'        // GLONASS constellation
  | 'galileo'        // Galileo constellation
  | 'beidou'         // BeiDou constellation
  | 'iridium'        // Iridium constellation
  | 'oneweb'         // OneWeb constellation
  | 'intelsat'       // Intelsat satellites
  | 'ses'            // SES satellites
  | 'orbcomm'        // Orbcomm satellites
  | 'amateur'        // Amateur satellites
  | 'education'      // Educational satellites
  | 'weather'        // Weather satellites
  | 'noaa'           // NOAA satellites
  | 'goes'           // GOES satellites
  | 'resource'       // Earth resource satellites
  | 'disaster'       // Disaster monitoring satellites
  | 'science'        // Scientific satellites
  | 'cubesat'        // CubeSats
  | 'military'       // Military satellites
  | 'radar'          // Radar imaging satellites
  | 'comms'          // Communications satellites
  | 'navigation'     // Navigation satellites
  | 'scientific'     // Scientific experiments
  | 'other'          // Other satellites
  | 'last-30-days'   // Launches from last 30 days
  | 'last-60-days';  // Launches from last 60 days

interface CelesTrakSatellite {
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  TLE_LINE1?: string;
  TLE_LINE2?: string;
  EPOCH?: string;
  MEAN_MOTION?: number;
  ECCENTRICITY?: number;
  INCLINATION?: number;
  RA_OF_ASC_NODE?: number;
  ARG_OF_PERICENTER?: number;
  MEAN_ANOMALY?: number;
}

interface CelesTrakResponse {
  name: string;
  header: {
    catalogCreator: string;
    catalogNumber: number;
    title: string;
    created: string;
  };
  data: CelesTrakSatellite[];
}

type CelesTrakApiPayload =
  | CelesTrakSatellite[]
  | CelesTrakResponse
  | { data?: CelesTrakSatellite[] };

export class CelesTrakAdapter extends BaseAdapter {
  sourceName = 'celestrak';
  mode: 'streaming' | 'polling' = 'polling';
  
  private config: CelesTrakConfig;
  private pollingInterval: number;
  private tleCache: Map<string, CelesTrakSatellite> = new Map();
  private lastFetch: Date | null = null;

  constructor(config: CelesTrakConfig) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 60000; // Default 1 minute
  }

  protected async doStart(): Promise<void> {
    console.log(`[CelesTrak] Starting adapter for groups: ${this.config.groups.join(', ')}`);
    await this.fetchAllGroups();
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[CelesTrak] Stopping adapter`);
    this.tleCache.clear();
  }

  async fetchAllGroups(): Promise<void> {
    try {
      for (const group of this.config.groups) {
        await this.fetchGroup(group);
      }
      this.lastFetch = new Date();
      this.recordSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[CelesTrak] Error fetching groups: ${message}`);
      this.recordFailure(message);
      this.emitError(error instanceof Error ? error : new Error(message));
    }
  }

  private async fetchGroup(group: CelesTrakGroup): Promise<void> {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeaconScope/1.0 (+https://localhost)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`CelesTrak API error: ${response.status}`);
    }

    const payload = await response.json() as CelesTrakApiPayload;
    const satellites = this.extractSatellites(payload);

    let skipped = 0;
    for (const sat of satellites) {
      if (!this.hasValidTle(sat)) {
        skipped += 1;
        continue;
      }
      const key = sat.OBJECT_ID || sat.OBJECT_NAME;
      if (!key) {
        skipped += 1;
        continue;
      }
      this.tleCache.set(key, sat);
    }

    console.log(`[CelesTrak] Fetched ${satellites.length} satellites from group '${group}' (${skipped} skipped invalid TLE)`);
  }

  private extractSatellites(payload: CelesTrakApiPayload): CelesTrakSatellite[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray((payload as CelesTrakResponse).data)) {
      return (payload as CelesTrakResponse).data;
    }
    return [];
  }

  private hasValidTle(sat: CelesTrakSatellite): boolean {
    if (!sat || typeof sat !== 'object') {
      return false;
    }

    if (typeof sat.TLE_LINE1 !== 'string' || typeof sat.TLE_LINE2 !== 'string') {
      return false;
    }

    const line1 = sat.TLE_LINE1.trim();
    const line2 = sat.TLE_LINE2.trim();
    return line1.length >= 60 && line2.length >= 60;
  }

  getSatellitePosition(satrec: CelesTrakSatellite, time: Date = new Date()): { lat: number; lng: number; alt: number } | null {
    try {
      if (!this.hasValidTle(satrec)) {
        return null;
      }

      const satrecProp = satellite.twoline2satrec(satrec.TLE_LINE1!, satrec.TLE_LINE2!);
      const positionAndVelocity = satellite.propagate(satrecProp, time);
      
      const position = positionAndVelocity.position;
      if (typeof position === 'boolean' || !position) {
        return null;
      }

      const gmst = satellite.gstime(time);
      const gdPos = satellite.eciToGeodetic(position, gmst);

      return {
        lat: satellite.degreesLat(gdPos.latitude),
        lng: satellite.degreesLong(gdPos.longitude),
        alt: gdPos.height
      };
    } catch (error) {
      console.error(`[CelesTrak] Error propagating satellite ${satrec.OBJECT_NAME || satrec.OBJECT_ID || 'unknown'}:`, error);
      return null;
    }
  }

  async emitAllPositions(time: Date = new Date()): Promise<void> {
    for (const [key, sat] of this.tleCache) {
      const position = this.getSatellitePosition(sat, time);
      
      if (position) {
        const normalized = {
          source: 'celestrak',
          assetId: sat.OBJECT_ID || key,
          assetType: 'satellite' as const,
          lat: position.lat,
          lng: position.lng,
          altitude: position.alt,
          timestamp: time.toISOString(),
          metadata: {
            satelliteName: sat.OBJECT_NAME || sat.OBJECT_ID || 'UNKNOWN',
            group: this.getSatelliteGroup(key),
            meanMotion: sat.MEAN_MOTION,
            eccentricity: sat.ECCENTRICITY,
            inclination: sat.INCLINATION
          }
        };

        this.recordMessage();
        this.events.onPositionUpdate?.(normalized);
      }
    }
  }

  private getSatelliteGroup(key: string): string {
    for (const [k, sat] of this.tleCache) {
      if (k === key) {
        for (const group of this.config.groups) {
          // Try to identify group based on satellite name patterns
          const name = (sat.OBJECT_NAME || '').toLowerCase();
          if (group === 'starlink' && name.includes('starlink')) return 'starlink';
          if (group === 'stations' && (name.includes('iss') || name.includes('tiangong'))) return 'stations';
          if (group === 'planet' && name.includes('planet')) return 'planet';
          if (group === 'gps-ops' && name.includes('gps')) return 'gps';
        }
      }
    }
    return 'other';
  }

  getCachedSatellites(): CelesTrakSatellite[] {
    return Array.from(this.tleCache.values());
  }

  getCacheStats(): { totalSatellites: number; lastFetch: Date | null } {
    return {
      totalSatellites: this.tleCache.size,
      lastFetch: this.lastFetch
    };
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }
}
