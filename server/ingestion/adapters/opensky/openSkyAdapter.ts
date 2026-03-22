import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents, AdapterConfig } from '../adapterInterface';
import { openSkyNormalizer } from './openSkyNormalizer';
import { OpenSkyStateVector, OpenSkyConfig } from './openSkyTypes';

export class OpenSkyAdapter extends BaseAdapter {
  sourceName = 'opensky';
  mode: 'streaming' | 'polling' = 'polling';
  
  private config: OpenSkyConfig = {};
  private pollingInterval: number = 60000; // Default 1 minute
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(config: OpenSkyConfig = {}) {
    super();
    this.config = config;
    this.pollingInterval = config.pollingInterval || 60000;
  }

  protected async doStart(): Promise<void> {
    console.log(`[OpenSky] Starting polling adapter with interval ${this.pollingInterval}ms`);
    this.recordSuccess();
  }

  protected async doStop(): Promise<void> {
    console.log(`[OpenSky] Stopping polling adapter`);
  }

  async poll(): Promise<void> {
    const bbox = this.config.boundingBox;
    const url = this.buildUrl(bbox);

    try {
      const response = await fetch(url, {
        headers: await this.buildHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.accessToken = null;
          this.accessTokenExpiresAt = 0;
        }
        throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { states: OpenSkyStateVector[] | null };
      
      if (!data.states) {
        return;
      }

      for (const vector of data.states) {
        if (bbox && !openSkyNormalizer.isInBoundingBox(vector, bbox)) {
          continue;
        }

        const normalized = openSkyNormalizer.normalizeStateVector(vector);
        if (normalized) {
          this.recordMessage();
          this.events.onPositionUpdate?.(normalized);
        }

        if (openSkyNormalizer.isStale(vector)) {
          const lastKnown = openSkyNormalizer.getLastKnownPosition(vector);
          if (lastKnown) {
            this.events.onDetection?.({
              source: 'opensky',
              beaconId: vector.icao24,
              domainType: 'aviation',
              lat: lastKnown.lat,
              lng: lastKnown.lng,
              timestamp: new Date().toISOString(),
              metadata: {
                callsign: vector.callsign,
                lastContact: vector.last_contact,
                reason: 'stale_track'
              }
            });
          }
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
    const baseUrl = 'https://opensky-network.org/api/states/all';
    
    if (!bbox) {
      return baseUrl;
    }

    const params = new URLSearchParams({
      lamin: bbox.latMin.toString(),
      lamax: bbox.latMax.toString(),
      lomin: bbox.lngMin.toString(),
      lomax: bbox.lngMax.toString()
    });

    return `${baseUrl}?${params.toString()}`;
  }

  getPollingInterval(): number {
    return this.pollingInterval;
  }

  private async buildHeaders(): Promise<HeadersInit | undefined> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 30_000) {
      return this.accessToken;
    }

    const clientId = this.config.clientId?.trim();
    const clientSecret = this.config.clientSecret?.trim();
    if (!clientId || !clientSecret) {
      return null;
    }

    const tokenResponse = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`OpenSky token error: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenPayload = await tokenResponse.json() as {
      access_token?: string;
      expires_in?: number;
    };

    if (!tokenPayload.access_token) {
      throw new Error('OpenSky token error: missing access_token');
    }

    this.accessToken = tokenPayload.access_token;
    this.accessTokenExpiresAt = now + ((tokenPayload.expires_in ?? 300) * 1000);
    return this.accessToken;
  }
}
