export type RuntimeMode = 'dev' | 'demo' | 'live' | 'mixed';

export interface FeatureFlags {
  simulator: {
    enabled: boolean;
    eventInterval: number;
  };
  adapters: {
    ais: boolean;
    opensky: boolean;
    satellite: boolean;
    gtfs: boolean;
  };
  replay: {
    enabled: boolean;
    maxDuration: number;
  };
  analytics: {
    enabled: boolean;
    cacheEnabled: boolean;
    cacheTtl: number;
  };
  alerts: {
    enabled: boolean;
    dedupe: boolean;
    cooldown: number;
  };
  audit: {
    enabled: boolean;
    retention: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    requestLogging: boolean;
    adapterLogging: boolean;
  };
}

const defaultFlags: FeatureFlags = {
  simulator: {
    enabled: true,
    eventInterval: 5000
  },
  adapters: {
    ais: false,
    opensky: false,
    satellite: false,
    gtfs: false
  },
  replay: {
    enabled: true,
    maxDuration: 86400000
  },
  analytics: {
    enabled: true,
    cacheEnabled: false,
    cacheTtl: 300000
  },
  alerts: {
    enabled: true,
    dedupe: true,
    cooldown: 60000
  },
  audit: {
    enabled: true,
    retention: 30
  },
  logging: {
    level: 'info',
    requestLogging: true,
    adapterLogging: true
  }
};

const demoFlags: FeatureFlags = {
  ...defaultFlags,
  simulator: {
    enabled: true,
    eventInterval: 3000
  },
  analytics: {
    enabled: true,
    cacheEnabled: false,
    cacheTtl: 60000
  },
  logging: {
    level: 'info',
    requestLogging: true,
    adapterLogging: true
  }
};

const liveFlags: FeatureFlags = {
  ...defaultFlags,
  simulator: {
    enabled: false,
    eventInterval: 5000
  },
  logging: {
    level: 'warn',
    requestLogging: true,
    adapterLogging: true
  }
};

const devFlags: FeatureFlags = {
  ...defaultFlags,
  simulator: {
    enabled: true,
    eventInterval: 5000
  },
  logging: {
    level: 'debug',
    requestLogging: true,
    adapterLogging: true
  }
};

class FeatureFlagsManager {
  private flags: FeatureFlags = defaultFlags;
  private mode: RuntimeMode = 'dev';

  initialize() {
    const mode = (process.env.RUNTIME_MODE as RuntimeMode) || 'dev';
    this.mode = mode;

    switch (mode) {
      case 'dev':
        this.flags = devFlags;
        break;
      case 'demo':
        this.flags = demoFlags;
        break;
      case 'live':
        this.flags = liveFlags;
        break;
      case 'mixed':
        this.flags = { ...defaultFlags };
        this.applyEnvOverrides();
        break;
    }

    this.applyEnvOverrides();
  }

  private applyEnvOverrides() {
    if (process.env.SIMULATOR_ENABLED !== undefined) {
      this.flags.simulator.enabled = process.env.SIMULATOR_ENABLED === 'true';
    }
    if (process.env.SIMULATOR_INTERVAL !== undefined) {
      this.flags.simulator.eventInterval = parseInt(process.env.SIMULATOR_INTERVAL, 10);
    }
    if (process.env.LOG_LEVEL !== undefined) {
      this.flags.logging.level = process.env.LOG_LEVEL as FeatureFlags['logging']['level'];
    }
    if (process.env.AIS_ENABLED !== undefined) {
      this.flags.adapters.ais = process.env.AIS_ENABLED === 'true';
    }
    if (process.env.OPENSKY_ENABLED !== undefined) {
      this.flags.adapters.opensky = process.env.OPENSKY_ENABLED === 'true';
    }
  }

  getFlags(): FeatureFlags {
    return this.flags;
  }

  getMode(): RuntimeMode {
    return this.mode;
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    if (typeof this.flags[feature] === 'boolean') {
      return this.flags[feature] as boolean;
    }
    if (feature === 'adapters') {
      return Object.values(this.flags.adapters).some(v => v);
    }
    return true;
  }

  getSimulatorConfig() {
    return this.flags.simulator;
  }

  getAdapterConfig(adapter: keyof FeatureFlags['adapters']) {
    return this.flags.adapters[adapter];
  }

  getReplayConfig() {
    return this.flags.replay;
  }

  getAnalyticsConfig() {
    return this.flags.analytics;
  }

  getAlertsConfig() {
    return this.flags.alerts;
  }

  getAuditConfig() {
    return this.flags.audit;
  }

  getLoggingConfig() {
    return this.flags.logging;
  }

  updateFlags(updates: Partial<FeatureFlags>) {
    this.flags = { ...this.flags, ...updates };
  }
}

export const featureFlags = new FeatureFlagsManager();
