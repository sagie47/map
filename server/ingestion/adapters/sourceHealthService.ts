import { AdapterHealth } from './adapterInterface';
import { adapterRegistry } from './adapterRegistry';

export interface SourceHealthSummary {
  totalSources: number;
  healthySources: number;
  degradedSources: number;
  failedSources: number;
  stoppedSources: number;
  sources: AdapterHealth[];
}

export class SourceHealthService {
  getHealthSummary(): SourceHealthSummary {
    const sources = adapterRegistry.getAllHealth();
    
    let healthy = 0;
    let degraded = 0;
    let failed = 0;
    let stopped = 0;

    for (const source of sources) {
      if (source.status === 'running') {
        if (source.consecutiveFailures > 3) {
          degraded++;
        } else {
          healthy++;
        }
      } else if (source.status === 'error') {
        failed++;
      } else {
        stopped++;
      }
    }

    return {
      totalSources: sources.length,
      healthySources: healthy,
      degradedSources: degraded,
      failedSources: failed,
      stoppedSources: stopped,
      sources
    };
  }

  getSourceHealth(sourceName: string): AdapterHealth | undefined {
    const adapter = adapterRegistry.get(sourceName);
    return adapter?.health();
  }

  isSourceHealthy(sourceName: string): boolean {
    const health = this.getSourceHealth(sourceName);
    if (!health) return false;
    
    return health.status === 'running' && health.consecutiveFailures <= 3;
  }

  getDegradedSources(): string[] {
    const sources = adapterRegistry.getAllHealth();
    return sources
      .filter(s => s.status === 'running' && s.consecutiveFailures > 3)
      .map(s => s.sourceName);
  }

  getFailedSources(): string[] {
    const sources = adapterRegistry.getAllHealth();
    return sources
      .filter(s => s.status === 'error')
      .map(s => s.sourceName);
  }
}

export const sourceHealthService = new SourceHealthService();
