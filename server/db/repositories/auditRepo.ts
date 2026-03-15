import { db } from '../client';

export type AuditEventType =
  | 'source_event_received'
  | 'incident_created'
  | 'incident_updated'
  | 'incident_resolved'
  | 'incident_dismissed'
  | 'state_transition'
  | 'operator_action'
  | 'notification_sent'
  | 'source_degraded'
  | 'source_recovered'
  | 'replay_requested'
  | 'analytics_generated';

export type EntityType =
  | 'incident'
  | 'signal_event'
  | 'receiver'
  | 'source'
  | 'operator_action'
  | 'notification';

export type ActorType = 'system' | 'operator' | 'adapter';

export interface AuditEntry {
  id: string;
  eventType: AuditEventType;
  entityType: EntityType;
  entityId: string | null;
  actorType: ActorType;
  actorId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export class AuditRepo {
  create(entry: AuditEntry) {
    db.prepare(`
      INSERT INTO audit_log (id, event_type, entity_type, entity_id, actor_type, actor_id, action, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.eventType,
      entry.entityType,
      entry.entityId,
      entry.actorType,
      entry.actorId,
      entry.action,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.createdAt
    );
  }

  getByEntity(entityType: EntityType, entityId: string): AuditEntry[] {
    const rows = db.prepare(`
      SELECT id, event_type as eventType, entity_type as entityType, entity_id as entityId,
             actor_type as actorType, actor_id as actorId, action, details_json, created_at as createdAt
      FROM audit_log 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `).all(entityType, entityId) as any[];

    return rows.map(row => ({
      ...row,
      details: row.details_json ? JSON.parse(row.details_json) : null
    }));
  }

  getByDateRange(startDate: string, endDate: string): AuditEntry[] {
    const rows = db.prepare(`
      SELECT id, event_type as eventType, entity_type as entityType, entity_id as entityId,
             actor_type as actorType, actor_id as actorId, action, details_json, created_at as createdAt
      FROM audit_log 
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `).all(startDate, endDate) as any[];

    return rows.map(row => ({
      ...row,
      details: row.details_json ? JSON.parse(row.details_json) : null
    }));
  }

  getRecent(limit: number = 100): AuditEntry[] {
    const rows = db.prepare(`
      SELECT id, event_type as eventType, entity_type as entityType, entity_id as entityId,
             actor_type as actorType, actor_id as actorId, action, details_json, created_at as createdAt
      FROM audit_log 
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      ...row,
      details: row.details_json ? JSON.parse(row.details_json) : null
    }));
  }

  getByEventType(eventType: AuditEventType, limit: number = 100): AuditEntry[] {
    const rows = db.prepare(`
      SELECT id, event_type as eventType, entity_type as entityType, entity_id as entityId,
             actor_type as actorType, actor_id as actorId, action, details_json, created_at as createdAt
      FROM audit_log 
      WHERE event_type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(eventType, limit) as any[];

    return rows.map(row => ({
      ...row,
      details: row.details_json ? JSON.parse(row.details_json) : null
    }));
  }

  deleteOlderThan(date: string): number {
    const result = db.prepare('DELETE FROM audit_log WHERE created_at < ?').run(date);
    return result.changes;
  }
}

export const auditRepo = new AuditRepo();
