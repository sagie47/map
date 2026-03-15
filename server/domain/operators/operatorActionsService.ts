import { operatorActionsRepo, OperatorAction, OperatorActionType } from '../../db/repositories/operatorActionsRepo';
import { auditRepo, AuditEventType, EntityType, ActorType } from '../../db/repositories/auditRepo';
import { incidentsRepo } from '../../db/repositories/incidentsRepo';
import { INCIDENT_STATUSES } from '../../../shared/constants/statuses';
import { subsystemLoggers } from '../../app/logger';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export interface OperatorActionInput {
  incidentId: string;
  actionType: OperatorActionType;
  operatorId?: string;
  payload?: Record<string, unknown>;
}

export class OperatorActionsService {
  private logger = subsystemLoggers.incident;

  executeAction(input: OperatorActionInput): OperatorAction | null {
    const { incidentId, actionType, operatorId, payload } = input;

    const incident = incidentsRepo.getById(incidentId);
    if (!incident) {
      this.logger.warn('action_failed', `Incident not found: ${incidentId}`, { actionType });
      return null;
    }

    const actionId = `OP-${generateId()}`;
    const action: OperatorAction = {
      id: actionId,
      incidentId,
      actionType,
      operatorId: operatorId || 'unknown',
      payload,
      createdAt: new Date().toISOString()
    };

    operatorActionsRepo.create(action);

    this.applyActionToIncident(incident, actionType, payload);
    this.recordAuditTrail(incident, actionType, operatorId, payload);

    this.logger.info('action_executed', `Operator action: ${actionType} on ${incidentId}`, {
      actionId,
      actionType,
      operatorId
    });

    return action;
  }

  private applyActionToIncident(incident: any, actionType: OperatorActionType, payload?: Record<string, unknown>) {
    switch (actionType) {
      case 'resolve':
        incidentsRepo.resolveIncident(incident.id, payload?.reason as string || 'resolved_by_operator');
        break;
      case 'dismiss':
        incidentsRepo.resolveIncident(incident.id, 'dismissed_by_operator');
        break;
      case 'escalate':
        incidentsRepo.updateIncident(incident.id, {
          status: INCIDENT_STATUSES.ACTIVE,
          severity: 'critical'
        });
        break;
      case 'mark_false_positive':
        incidentsRepo.resolveIncident(incident.id, 'false_positive');
        break;
      case 'mark_test':
        incidentsRepo.updateIncident(incident.id, {
          status: INCIDENT_STATUSES.RESOLVED,
          resolution_reason: 'test_device'
        });
        break;
      case 'acknowledge':
        incidentsRepo.updateIncident(incident.id, {
          status: INCIDENT_STATUSES.ACTIVE
        });
        break;
      case 'pin':
      case 'add_note':
        break;
    }
  }

  private recordAuditTrail(incident: any, actionType: OperatorActionType, operatorId?: string, payload?: Record<string, unknown>) {
    const auditEntry = {
      id: `AUDIT-${generateId()}`,
      eventType: 'operator_action' as AuditEventType,
      entityType: 'incident' as EntityType,
      entityId: incident.id,
      actorType: 'operator' as ActorType,
      actorId: operatorId || 'unknown',
      action: actionType,
      details: payload || null,
      createdAt: new Date().toISOString()
    };

    auditRepo.create(auditEntry);
  }

  getIncidentActions(incidentId: string): OperatorAction[] {
    return operatorActionsRepo.getByIncidentId(incidentId);
  }

  getRecentActions(limit: number = 50): OperatorAction[] {
    return operatorActionsRepo.getRecent(limit);
  }

  validateAction(actionType: OperatorActionType, incidentId: string): { valid: boolean; reason?: string } {
    const incident = incidentsRepo.getById(incidentId);
    if (!incident) {
      return { valid: false, reason: 'Incident not found' };
    }

    const validTransitions: Record<OperatorActionType, string[]> = {
      resolve: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE],
      dismiss: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE],
      escalate: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE],
      mark_false_positive: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE],
      mark_test: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE],
      add_note: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE, INCIDENT_STATUSES.RESOLVED],
      pin: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE, INCIDENT_STATUSES.RESOLVED],
      acknowledge: [INCIDENT_STATUSES.ACTIVE, INCIDENT_STATUSES.CANDIDATE, INCIDENT_STATUSES.HIGH_CONFIDENCE]
    };

    const allowedStatuses = validTransitions[actionType];
    if (!allowedStatuses.includes(incident.status)) {
      return { valid: false, reason: `Cannot perform ${actionType} on incident with status ${incident.status}` };
    }

    return { valid: true };
  }
}

export const operatorActionsService = new OperatorActionsService();
