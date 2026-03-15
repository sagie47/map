import { db } from '../client';

export type OperatorActionType = 
  | 'resolve'
  | 'dismiss'
  | 'escalate'
  | 'mark_false_positive'
  | 'mark_test'
  | 'add_note'
  | 'pin'
  | 'acknowledge';

export interface OperatorAction {
  id: string;
  incidentId: string | null;
  actionType: OperatorActionType;
  operatorId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export class OperatorActionsRepo {
  create(action: OperatorAction) {
    db.prepare(`
      INSERT INTO operator_actions (id, incident_id, action_type, operator_id, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      action.id,
      action.incidentId,
      action.actionType,
      action.operatorId,
      action.payload ? JSON.stringify(action.payload) : null,
      action.createdAt
    );
  }

  getById(id: string): OperatorAction | undefined {
    const row = db.prepare(`
      SELECT id, incident_id as incidentId, action_type as actionType, 
             operator_id as operatorId, payload_json, created_at as createdAt
      FROM operator_actions WHERE id = ?
    `).get(id) as any;

    if (!row) return undefined;

    return {
      ...row,
      payload: row.payload_json ? JSON.parse(row.payload_json) : null
    };
  }

  getByIncidentId(incidentId: string): OperatorAction[] {
    const rows = db.prepare(`
      SELECT id, incident_id as incidentId, action_type as actionType, 
             operator_id as operatorId, payload_json, created_at as createdAt
      FROM operator_actions WHERE incident_id = ?
      ORDER BY created_at DESC
    `).all(incidentId) as any[];

    return rows.map(row => ({
      ...row,
      payload: row.payload_json ? JSON.parse(row.payload_json) : null
    }));
  }

  getRecent(limit: number = 50): OperatorAction[] {
    const rows = db.prepare(`
      SELECT id, incident_id as incidentId, action_type as actionType, 
             operator_id as operatorId, payload_json, created_at as createdAt
      FROM operator_actions 
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      ...row,
      payload: row.payload_json ? JSON.parse(row.payload_json) : null
    }));
  }

  deleteByIncidentId(incidentId: string) {
    db.prepare('DELETE FROM operator_actions WHERE incident_id = ?').run(incidentId);
  }
}

export const operatorActionsRepo = new OperatorActionsRepo();
