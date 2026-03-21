import { Adapter, AdapterConfig, AdapterHealth, AdapterEvents, NormalizedEvent } from './adapterInterface';
import { subsystemLoggers } from '../../app/logger';

export interface AdapterRegistryEntry {
  adapter: Adapter;
  config: AdapterConfig;
  events: AdapterEvents;
}

class AdapterRegistry {
  private adapters: Map<string, AdapterRegistryEntry> = new Map();
  private globalEvents: AdapterEvents = {};
  private logger = subsystemLoggers.adapter;

  register(name: string, adapter: Adapter, config: AdapterConfig, events: AdapterEvents = {}) {
    this.adapters.set(name, { adapter, config, events });
  }

  unregister(name: string) {
    const entry = this.adapters.get(name);
    if (entry) {
      void entry.adapter.stop().catch(error => {
        this.logger.error('adapter_stop_failed', `Failed to stop adapter ${name} during unregister`, error as Error, { adapterName: name });
      });
      this.adapters.delete(name);
    }
  }

  get(name: string): Adapter | undefined {
    return this.adapters.get(name)?.adapter;
  }

  getConfig(name: string): AdapterConfig | undefined {
    return this.adapters.get(name)?.config;
  }

  getAllAdapters(): Adapter[] {
    return Array.from(this.adapters.values()).map(e => e.adapter);
  }

  getAllConfigs(): Record<string, AdapterConfig> {
    const configs: Record<string, AdapterConfig> = {};
    for (const [name, entry] of this.adapters) {
      configs[name] = entry.config;
    }
    return configs;
  }

  getAllHealth(): AdapterHealth[] {
    return Array.from(this.adapters.values()).map(e => e.adapter.health());
  }

  async startAll() {
    this.logger.info('adapter_start_all', 'Starting all enabled adapters', {
      adapters: Array.from(this.adapters.keys())
    });
    for (const [name, entry] of this.adapters) {
      if (entry.config.enabled) {
        try {
          await entry.adapter.start();
          this.logger.info('adapter_started', `Adapter started: ${name}`, { adapterName: name });
        } catch (error) {
          this.logger.error('adapter_start_failed', `Failed to start adapter ${name}`, error as Error, { adapterName: name });
        }
      }
    }
  }

  async stopAll() {
    for (const [name, entry] of this.adapters) {
      try {
        await entry.adapter.stop();
      } catch (error) {
        this.logger.error('adapter_stop_failed', `Failed to stop adapter ${name}`, error as Error, { adapterName: name });
      }
    }
  }

  setGlobalEvents(events: AdapterEvents) {
    this.globalEvents = events;
  }

  emitEvent(event: NormalizedEvent) {
    if ('onDetection' in this.globalEvents && 'beaconId' in event && 'domainType' in event) {
      this.globalEvents.onDetection?.(event as any);
    }
    if ('onPositionUpdate' in this.globalEvents && 'assetId' in event && 'assetType' in event) {
      this.globalEvents.onPositionUpdate?.(event as any);
    }
    if ('onHeartbeat' in this.globalEvents && 'receiverId' in event && 'status' in event) {
      this.globalEvents.onHeartbeat?.(event as any);
    }
    if ('onCoverageEvent' in this.globalEvents && 'satelliteId' in event && 'eventType' in event) {
      this.globalEvents.onCoverageEvent?.(event as any);
    }
  }
}

export const adapterRegistry = new AdapterRegistry();
