import { subsystemLoggers } from '../app/logger';
import { incidentsRepo } from '../db/repositories/incidentsRepo';
import { INCIDENT_STATUSES } from '../../shared/constants/statuses';

const logger = subsystemLoggers.job;

const STALE_INCIDENT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StaleIncidentResult {
  checked: number;
  marked: number;
  errors: number;
}

export async function checkStaleIncidents(): Promise<StaleIncidentResult> {
  logger.info('stale_incident_check', 'Starting stale incident check');
  
  const result: StaleIncidentResult = {
    checked: 0,
    marked: 0,
    errors: 0
  };

  try {
    const incidents = incidentsRepo.listWithFilters();
    const now = Date.now();

    for (const incident of incidents) {
      result.checked++;
      
      if (incident.status === INCIDENT_STATUSES.RESOLVED || 
          incident.status === INCIDENT_STATUSES.DISMISSED) {
        continue;
      }

      const lastSeen = new Date(incident.last_seen_at).getTime();
      const age = now - lastSeen;

      if (age > STALE_INCIDENT_THRESHOLD_MS) {
        try {
          incidentsRepo.resolveIncident(incident.id, 'stale_inactive');
          result.marked++;
          logger.info('incident_marked_stale', `Marked incident ${incident.id} as stale`, {
            incidentId: incident.id,
            ageMs: age
          });
        } catch (error) {
          result.errors++;
          logger.error('stale_mark_error', `Failed to mark incident ${incident.id} as stale`, error as Error);
        }
      }
    }

    logger.info('stale_incident_check_complete', 'Stale incident check completed', {
      checked: result.checked,
      marked: result.marked,
      errors: result.errors
    });
  } catch (error) {
    logger.error('stale_check_failed', 'Stale incident check failed', error as Error);
  }

  return result;
}
