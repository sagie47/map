import { incidentTransitionsRepo, IncidentTransition } from '../../db/repositories/incidentTransitionsRepo';
import { INCIDENT_STATUSES } from '../../../shared/constants/statuses';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export interface TransitionInput {
  incidentId: string;
  fromStatus: string | null;
  toStatus: string;
  confidenceScore?: number;
  reason?: string;
  sourceEventId?: string;
}

export class IncidentTransitionsService {
  recordTransition(input: TransitionInput): IncidentTransition {
    const transition: IncidentTransition = {
      id: `TRN-${generateId()}`,
      incidentId: input.incidentId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      confidenceScore: input.confidenceScore ?? null,
      reason: input.reason ?? null,
      sourceEventId: input.sourceEventId ?? null,
      transitionedAt: new Date().toISOString()
    };

    incidentTransitionsRepo.create(transition);
    return transition;
  }

  recordInitialTransition(incidentId: string, initialStatus: string, confidenceScore: number): IncidentTransition {
    return this.recordTransition({
      incidentId,
      fromStatus: null,
      toStatus: initialStatus,
      confidenceScore,
      reason: 'Initial detection'
    });
  }

  recordStatusChange(
    incidentId: string,
    fromStatus: string,
    toStatus: string,
    confidenceScore: number,
    sourceEventId?: string
  ): IncidentTransition {
    return this.recordTransition({
      incidentId,
      fromStatus,
      toStatus,
      confidenceScore,
      sourceEventId,
      reason: `Status changed from ${fromStatus} to ${toStatus}`
    });
  }

  recordResolution(incidentId: string, resolutionReason: string): IncidentTransition {
    return this.recordTransition({
      incidentId,
      fromStatus: INCIDENT_STATUSES.ACTIVE,
      toStatus: INCIDENT_STATUSES.RESOLVED,
      reason: resolutionReason
    });
  }

  getTransitionHistory(incidentId: string): IncidentTransition[] {
    return incidentTransitionsRepo.getByIncidentId(incidentId);
  }

  getLatestTransition(incidentId: string): IncidentTransition | undefined {
    return incidentTransitionsRepo.getLatestByIncidentId(incidentId);
  }

  getAllTransitions(): IncidentTransition[] {
    return incidentTransitionsRepo.getAll();
  }

  getTransitionsByDateRange(startDate: string, endDate: string): IncidentTransition[] {
    return incidentTransitionsRepo.getByDateRange(startDate, endDate);
  }
}

export const incidentTransitionsService = new IncidentTransitionsService();
