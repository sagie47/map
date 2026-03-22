import { AdapterConfig } from './adapterInterface';
import { AISConfig } from './ais/aisTypes';
import { OpenSkyConfig } from './opensky/openSkyTypes';
import { SatelliteConfig } from './satellite/satelliteTypes';
import { GTFSConfig } from './gtfs/gtfsTypes';
import { NWSConfig } from './nws/nwsAdapter';
import { MarineTrafficConfig } from './marinetraffic/mtTypes';
import { ADSBConfig } from './adsb/adsbTypes';
import { WindyConfig } from './windy/windyTypes';
import { USGSConfig } from './usgs/usgsTypes';
import { NDBCConfig } from './ndbc/ndbcTypes';
import { NWWSConfig } from './nwws/nwwsTypes';

export interface AdapterSettings {
  ais: AISConfig & AdapterConfig;
  opensky: OpenSkyConfig & AdapterConfig;
  satellite: SatelliteConfig & AdapterConfig;
  gtfs: GTFSConfig & AdapterConfig;
  nws: NWSConfig & AdapterConfig;
  marinetraffic: MarineTrafficConfig & AdapterConfig;
  adsb: ADSBConfig & AdapterConfig;
  windy: WindyConfig & AdapterConfig;
  usgs: USGSConfig & AdapterConfig;
  ndbc: NDBCConfig & AdapterConfig;
  nwws: NWWSConfig & AdapterConfig;
  simulator: {
    enabled: boolean;
    eventInterval: number;
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}

function parseNumber(
  value: string | undefined,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (options.min !== undefined && parsed < options.min) return options.min;
  if (options.max !== undefined && parsed > options.max) return options.max;
  return parsed;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function buildBoundingBox(prefix: string) {
  return {
    latMin: parseNumber(process.env[`${prefix}_LAT_MIN`], -90, { min: -90, max: 90 }),
    latMax: parseNumber(process.env[`${prefix}_LAT_MAX`], 90, { min: -90, max: 90 }),
    lngMin: parseNumber(process.env[`${prefix}_LNG_MIN`], -180, { min: -180, max: 180 }),
    lngMax: parseNumber(process.env[`${prefix}_LNG_MAX`], 180, { min: -180, max: 180 })
  };
}

function buildSettingsFromEnv(): AdapterSettings {
  return {
    ais: {
      enabled: parseBoolean(process.env.AIS_ENABLED, false),
      streamingUrl: process.env.AIS_STREAMING_URL || '',
      apiKey: process.env.AIS_API_KEY || '',
      boundingBox: buildBoundingBox('AIS')
    },
    opensky: {
      enabled: parseBoolean(process.env.OPENSKY_ENABLED, false),
      clientId: process.env.OPENSKY_CLIENT_ID || '',
      clientSecret: process.env.OPENSKY_CLIENT_SECRET || '',
      pollingInterval: parseNumber(process.env.OPENSKY_POLLING_INTERVAL, 60000, { min: 1000 }),
      boundingBox: buildBoundingBox('OPENSKY')
    },
    satellite: {
      enabled: parseBoolean(process.env.SATELLITE_ENABLED, false),
      provider: (process.env.SATELLITE_PROVIDER as 'n2yo' | 'celestrak') || 'celestrak',
      apiKey: process.env.N2YO_API_KEY,
      satelliteIds: parseCsv(process.env.SATELLITE_IDS),
      pollingInterval: parseNumber(process.env.SATELLITE_POLLING_INTERVAL, 60000, { min: 1000 }),
      celestrakGroups: parseCsv(process.env.CELESTRAK_GROUPS || 'stations,visual,gps-ops')
    },
    gtfs: {
      enabled: parseBoolean(process.env.GTFS_ENABLED, false),
      feedUrl: process.env.GTFS_FEED_URL || '',
      pollingInterval: parseNumber(process.env.GTFS_POLLING_INTERVAL, 30000, { min: 1000 }),
      deviationThreshold: parseNumber(process.env.GTFS_DEVIATION_THRESHOLD, 500, { min: 0 })
    },
    nws: {
      enabled: parseBoolean(process.env.NWS_ENABLED, true),
      pollingInterval: parseNumber(process.env.NWS_POLLING_INTERVAL, 300000, { min: 1000 })
    },
    marinetraffic: {
      enabled: parseBoolean(process.env.MT_ENABLED, false),
      apiKey: process.env.MT_API_KEY || '',
      pollingInterval: parseNumber(process.env.MT_POLLING_INTERVAL, 60000, { min: 1000 }),
      boundingBox: {
        latMin: parseNumber(process.env.MT_BOUNDING_BOX_LAT_MIN, -90, { min: -90, max: 90 }),
        latMax: parseNumber(process.env.MT_BOUNDING_BOX_LAT_MAX, 90, { min: -90, max: 90 }),
        lngMin: parseNumber(process.env.MT_BOUNDING_BOX_LNG_MIN, -180, { min: -180, max: 180 }),
        lngMax: parseNumber(process.env.MT_BOUNDING_BOX_LNG_MAX, 180, { min: -180, max: 180 })
      }
    },
    adsb: {
      enabled: parseBoolean(process.env.ADSB_ENABLED, false),
      pollingInterval: parseNumber(process.env.ADSB_POLLING_INTERVAL, 60000, { min: 1000 }),
      boundingBox: {
        latMin: parseNumber(process.env.ADSB_BOUNDING_BOX_LAT_MIN, -90, { min: -90, max: 90 }),
        latMax: parseNumber(process.env.ADSB_BOUNDING_BOX_LAT_MAX, 90, { min: -90, max: 90 }),
        lngMin: parseNumber(process.env.ADSB_BOUNDING_BOX_LNG_MIN, -180, { min: -180, max: 180 }),
        lngMax: parseNumber(process.env.ADSB_BOUNDING_BOX_LNG_MAX, 180, { min: -180, max: 180 })
      }
    },
    windy: {
      enabled: parseBoolean(process.env.WINDY_ENABLED, false),
      apiKey: process.env.WINDY_API_KEY || '',
      streamingUrl: process.env.WINDY_STREAMING_URL || '',
      boundingBox: buildBoundingBox('WINDY')
    },
    usgs: {
      enabled: parseBoolean(process.env.USGS_ENABLED, false),
      pollingInterval: parseNumber(process.env.USGS_POLLING_INTERVAL, 60000, { min: 1000 })
    },
    ndbc: {
      enabled: parseBoolean(process.env.NDBC_ENABLED, false),
      pollingInterval: parseNumber(process.env.NDBC_POLLING_INTERVAL, 60000, { min: 1000 }),
      stationIds: parseCsv(process.env.NDBC_STATION_IDS)
    },
    nwws: {
      enabled: parseBoolean(process.env.NWWS_ENABLED, false),
      username: process.env.NWWS_USERNAME || '',
      password: process.env.NWWS_PASSWORD || '',
      pollingInterval: parseNumber(process.env.NWWS_POLLING_INTERVAL, 60000, { min: 1000 })
    },
    simulator: {
      enabled: parseBoolean(process.env.SIMULATOR_ENABLED, true),
      eventInterval: parseNumber(process.env.SIMULATOR_INTERVAL, 5000, { min: 250 })
    }
  };
}

class AdapterConfigManager {
  private settings: AdapterSettings = buildSettingsFromEnv();

  getSettings(): AdapterSettings {
    return this.settings;
  }

  reloadFromEnv() {
    this.settings = buildSettingsFromEnv();
  }

  updateSettings(newSettings: Partial<AdapterSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
  }

  getAdapterConfig(adapterName: keyof AdapterSettings): AdapterSettings[keyof AdapterSettings] {
    return this.settings[adapterName];
  }

  isAdapterEnabled(adapterName: keyof Omit<AdapterSettings, 'simulator'>): boolean {
    const config = this.settings[adapterName];
    return 'enabled' in config ? config.enabled : false;
  }

  isSimulatorEnabled(): boolean {
    return this.settings.simulator.enabled;
  }

  resetToDefaults() {
    this.settings = buildSettingsFromEnv();
  }

  validateSettings(): string[] {
    const issues: string[] = [];
    const checkBoundingBox = (
      name: string,
      bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number } | undefined
    ) => {
      if (!bbox) return;
      if (bbox.latMin >= bbox.latMax) {
        issues.push(`${name} bounding box is invalid: latMin must be less than latMax`);
      }
      if (bbox.lngMin >= bbox.lngMax) {
        issues.push(`${name} bounding box is invalid: lngMin must be less than lngMax`);
      }
    };

    if (this.settings.ais.enabled && !this.settings.ais.streamingUrl && !this.settings.ais.apiKey) {
      issues.push('AIS adapter is enabled but AIS_STREAMING_URL or AIS_API_KEY is required');
    }
    if (this.settings.gtfs.enabled && !this.settings.gtfs.feedUrl) {
      issues.push('GTFS adapter is enabled but GTFS_FEED_URL is missing');
    }
    if (this.settings.marinetraffic.enabled && !this.settings.marinetraffic.apiKey) {
      issues.push('MarineTraffic adapter is enabled but MT_API_KEY is missing');
    }
    if (this.settings.windy.enabled && !this.settings.windy.streamingUrl && !this.settings.windy.apiKey) {
      issues.push('Windy adapter is enabled but WINDY_STREAMING_URL or WINDY_API_KEY is required');
    }
    if (this.settings.satellite.enabled && this.settings.satellite.provider === 'n2yo' && !this.settings.satellite.apiKey) {
      issues.push('Satellite provider n2yo requires N2YO_API_KEY');
    }

    checkBoundingBox('AIS', this.settings.ais.boundingBox);
    checkBoundingBox('OpenSky', this.settings.opensky.boundingBox);
    checkBoundingBox('MarineTraffic', this.settings.marinetraffic.boundingBox);
    checkBoundingBox('ADSB', this.settings.adsb.boundingBox);
    checkBoundingBox('Windy', this.settings.windy.boundingBox);

    return issues;
  }
}

export const adapterConfigManager = new AdapterConfigManager();
