import { systemHealthRepo, SystemHealthRecord, HealthStatus } from '../../db/repositories/systemHealthRepo';
import { sourceHealthService } from '../../ingestion/adapters/sourceHealthService';
import { subsystemLoggers } from '../../app/logger';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export interface SystemHealthSummary {
  overall: HealthStatus;
  components: {
    name: string;
    status: HealthStatus;
    message: string | null;
    lastCheck: string;
  }[];
  timestamp: string;
}

export class SystemHealthService {
  private logger = subsystemLoggers.health;
  private staleThresholdMs = 60000;

  recordHealth(component: string, status: HealthStatus, message?: string, metadata?: Record<string, unknown>) {
    const record: SystemHealthRecord = {
      id: `HEALTH-${generateId()}`,
      component,
      status,
      message: message || null,
      metadata: metadata || null,
      recordedAt: new Date().toISOString()
    };

    systemHealthRepo.create(record);
  }

  checkSystemHealth(): SystemHealthSummary {
    const sources = sourceHealthService.getHealthSummary();
    
    const components = [
      this.checkDatabaseHealth(),
      this.checkSourcesHealth(sources),
      this.checkWebSocketHealth()
    ];

    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;
    
    let overall: HealthStatus = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      components,
      timestamp: new Date().toISOString()
    };
  }

  private checkDatabaseHealth(): { name: string; status: HealthStatus; message: string | null; lastCheck: string } {
    try {
      const { db } = require('../../db/client');
      const result = db.prepare('SELECT 1').get();
      
      return {
        name: 'database',
        status: 'healthy',
        message: null,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('health_check_failed', 'Database health check failed', error as Error);
      return {
        name: 'database',
        status: 'unhealthy',
        message: (error as Error).message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  private checkSourcesHealth(sources: any): { name: string; status: HealthStatus; message: string | null; lastCheck: string } {
    const total = sources.totalSources;
    const failed = sources.failedSources;
    const degraded = sources.degradedSources;

    let status: HealthStatus = 'healthy';
    let message: string | null = null;

    if (failed > total / 2) {
      status = 'unhealthy';
      message = `${failed} sources failed`;
    } else if (failed > 0 || degraded > 0) {
      status = 'degraded';
      message = `${failed} failed, ${degraded} degraded`;
    }

    return {
      name: 'sources',
      status,
      message,
      lastCheck: new Date().toISOString()
    };
  }

  private checkWebSocketHealth(): { name: string; status: HealthStatus; message: string | null; lastCheck: string } {
    return {
      name: 'websocket',
      status: 'healthy',
      message: null,
      lastCheck: new Date().toISOString()
    };
  }

  getComponentHealth(component: string): SystemHealthRecord | undefined {
    return systemHealthRepo.getByComponent(component);
  }

  getAllHealth(): SystemHealthRecord[] {
    return systemHealthRepo.getAll();
  }
}

export const systemHealthService = new SystemHealthService();
