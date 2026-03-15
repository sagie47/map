import { db } from '../client';

export interface IncidentTransition {
  id: string;
  incidentId: string;
  fromStatus: string | null;
  toStatus: string;
  confidenceScore: number | null;
  reason: string | null;
  sourceEventId: string | null;
  transitionedAt: string;
}

export class IncidentTransitionsRepo {
  create(transition: IncidentTransition) {
    db.prepare(`
      INSERT INTO incident_state_transitions 
      (id, incident_id, from_status, to_status, confidence_score, reason, source_event_id, transitioned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transition.id,
      transition.incidentId,
      transition.fromStatus,
      transition.toStatus,
      transition.confidenceScore,
      transition.reason,
      transition.sourceEventId,
      transition.transitionedAt
    );
  }

  getByIncidentId(incidentId: string): IncidentTransition[] {
    return db.prepare(`
      SELECT id, incident_id as incidentId, from_status as fromStatus, 
             to_status as toStatus, confidence_score as confidenceScore,
             reason, source_event_id as sourceEventId, transitioned_at as transitionedAt
      FROM incident_state_transitions 
      WHERE incident_id = ?
      ORDER BY transitioned_at ASC
    `).all(incidentId) as IncidentTransition[];
  }

  getLatestByIncidentId(incidentId: string): IncidentTransition | undefined {
    return db.prepare(`
      SELECT id, incident_id as incidentId, from_status as fromStatus, 
             to_status as toStatus, confidence_score as confidenceScore,
             reason, source_event_id as sourceEventId, transitioned_at as transitionedAt
      FROM incident_state_transitions 
      WHERE incident_id = ?
      ORDER BY transitioned_at DESC
      LIMIT 1
    `).get(incidentId) as IncidentTransition | undefined;
  }

  getAll(): IncidentTransition[] {
    return db.prepare(`
      SELECT id, incident_id as incidentId, from_status as fromStatus, 
             to_status as toStatus, confidence_score as confidenceScore,
             reason, source_event_id as sourceEventId, transitioned_at as transitionedAt
      FROM incident_state_transitions 
      ORDER BY transitioned_at DESC
    `).all() as IncidentTransition[];
  }

  getByDateRange(startDate: string, endDate: string): IncidentTransition[] {
    return db.prepare(`
      SELECT id, incident_id as incidentId, from_status as fromStatus, 
             to_status as toStatus, confidence_score as confidenceScore,
             reason, source_event_id as sourceEventId, transitioned_at as transitionedAt
      FROM incident_state_transitions 
      WHERE transitioned_at BETWEEN ? AND ?
      ORDER BY transitioned_at ASC
    `).all(startDate, endDate) as IncidentTransition[];
  }
}

export const incidentTransitionsRepo = new IncidentTransitionsRepo();
