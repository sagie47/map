import { subsystemLoggers } from '../app/logger';
import { sourceHealthService } from '../ingestion/adapters/sourceHealthService';
import { systemHealthService } from '../domain/health/systemHealthService';

const logger = subsystemLoggers.job;

export async function checkSourceHealth(): Promise<void> {
  logger.info('source_health_check', 'Starting source health check');

  try {
    const summary = sourceHealthService.getHealthSummary();

    systemHealthService.recordHealth(
      'sources',
      summary.failedSources > 0 ? 'unhealthy' : summary.degradedSources > 0 ? 'degraded' : 'healthy',
      `${summary.failedSources} failed, ${summary.degradedSources} degraded`,
      {
        totalSources: summary.totalSources,
        healthySources: summary.healthySources,
        failedSources: summary.failedSources,
        degradedSources: summary.degradedSources
      }
    );

    for (const source of summary.sources) {
      const status = source.status === 'running' 
        ? (source.consecutiveFailures > 3 ? 'degraded' : 'healthy')
        : 'unhealthy';

      systemHealthService.recordHealth(
        `source:${source.sourceName}`,
        status,
        source.lastError || null,
        {
          messagesReceived: source.messagesReceived,
          consecutiveFailures: source.consecutiveFailures,
          lastSuccessfulFetch: source.lastSuccessfulFetch
        }
      );
    }

    logger.info('source_health_check_complete', 'Source health check completed', {
      total: summary.totalSources,
      healthy: summary.healthySources,
      degraded: summary.degradedSources,
      failed: summary.failedSources
    });
  } catch (error) {
    logger.error('source_health_check_failed', 'Source health check failed', error as Error);
    systemHealthService.recordHealth('sources', 'unhealthy', (error as Error).message);
  }
}
