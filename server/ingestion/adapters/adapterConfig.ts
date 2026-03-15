import { AdapterConfig } from './adapterInterface';
import { AISConfig } from './ais/aisTypes';
import { OpenSkyConfig } from './opensky/openSkyTypes';
import { SatelliteConfig } from './satellite/satelliteTypes';
import { GTFSConfig } from './gtfs/gtfsTypes';

export interface AdapterSettings {
  ais: AISConfig & AdapterConfig;
  opensky: OpenSkyConfig & AdapterConfig;
  satellite: SatelliteConfig & AdapterConfig;
  gtfs: GTFSConfig & AdapterConfig;
  simulator: {
    enabled: boolean;
    eventInterval: number;
  };
}

const defaultSettings: AdapterSettings = {
  ais: {
    enabled: process.env.AIS_ENABLED === 'true',
    streamingUrl: process.env.AIS_STREAMING_URL || '',
    apiKey: process.env.AIS_API_KEY || '',
    boundingBox: {
      latMin: parseFloat(process.env.AIS_LAT_MIN || '-90'),
      latMax: parseFloat(process.env.AIS_LAT_MAX || '90'),
      lngMin: parseFloat(process.env.AIS_LNG_MIN || '-180'),
      lngMax: parseFloat(process.env.AIS_LNG_MAX || '180')
    }
  },
  opensky: {
    enabled: process.env.OPENSKY_ENABLED === 'true',
    pollingInterval: parseInt(process.env.OPENSKY_POLLING_INTERVAL || '60000', 10),
    boundingBox: {
      latMin: parseFloat(process.env.OPENSKY_LAT_MIN || '-90'),
      latMax: parseFloat(process.env.OPENSKY_LAT_MAX || '90'),
      lngMin: parseFloat(process.env.OPENSKY_LNG_MIN || '-180'),
      lngMax: parseFloat(process.env.OPENSKY_LNG_MAX || '180')
    }
  },
  satellite: {
    enabled: false,
    provider: 'n2yo',
    apiKey: process.env.N2YO_API_KEY,
    satelliteIds: (process.env.SATELLITE_IDS || '').split(',').filter(Boolean),
    pollingInterval: parseInt(process.env.SATELLITE_POLLING_INTERVAL || '300000', 10)
  },
  gtfs: {
    enabled: process.env.GTFS_ENABLED === 'true',
    feedUrl: process.env.GTFS_FEED_URL || '',
    pollingInterval: parseInt(process.env.GTFS_POLLING_INTERVAL || '30000', 10),
    deviationThreshold: parseInt(process.env.GTFS_DEVIATION_THRESHOLD || '500', 10)
  },
  simulator: {
    enabled: process.env.SIMULATOR_ENABLED !== 'false',
    eventInterval: parseInt(process.env.SIMULATOR_INTERVAL || '5000', 10)
  }
};

class AdapterConfigManager {
  private settings: AdapterSettings = defaultSettings;

  getSettings(): AdapterSettings {
    return this.settings;
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
    this.settings = defaultSettings;
  }
}

export const adapterConfigManager = new AdapterConfigManager();
