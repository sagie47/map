import { subsystemLoggers } from '../app/logger';
import { auditRepo } from '../db/repositories/auditRepo';
import { systemHealthRepo } from '../db/repositories/systemHealthRepo';
import { featureFlags } from '../app/featureFlags';

const logger = subsystemLoggers.job;

export interface CleanupResult {
  auditDeleted: number;
  healthDeleted: number;
}

export async function runCleanup(): Promise<CleanupResult> {
  logger.info('cleanup_job', 'Starting cleanup job');

  const result: CleanupResult = {
    auditDeleted: 0,
    healthDeleted: 0
  };

  try {
    const auditConfig = featureFlags.getAuditConfig();
    const auditRetentionDays = auditConfig.retention;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - auditRetentionDays);
    const cutoffStr = cutoffDate.toISOString();

    if (auditConfig.enabled) {
      result.auditDeleted = auditRepo.deleteOlderThan(cutoffStr);
      logger.info('audit_cleanup', `Deleted ${result.auditDeleted} audit entries older than ${cutoffStr}`);
    }

    const healthCutoff = new Date();
    healthCutoff.setDate(healthCutoff.getDate() - 7);
    result.healthDeleted = systemHealthRepo.deleteOlderThan(healthCutoff.toISOString());
    logger.info('health_cleanup', `Deleted ${result.healthDeleted} health records older than 7 days`);

    logger.info('cleanup_job_complete', 'Cleanup job completed', {
      auditDeleted: result.auditDeleted,
      healthDeleted: result.healthDeleted
    });
  } catch (error) {
    logger.error('cleanup_job_failed', 'Cleanup job failed', error as Error);
  }

  return result;
}
