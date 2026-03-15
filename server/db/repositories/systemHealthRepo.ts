import { db } from '../client';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface SystemHealthRecord {
  id: string;
  component: string;
  status: HealthStatus;
  message: string | null;
  metadata: Record<string, unknown> | null;
  recordedAt: string;
}

export class SystemHealthRepo {
  create(record: SystemHealthRecord) {
    db.prepare(`
      INSERT INTO system_health (id, component, status, message, metadata_json, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.component,
      record.status,
      record.message,
      record.metadata ? JSON.stringify(record.metadata) : null,
      record.recordedAt
    );
  }

  getByComponent(component: string): SystemHealthRecord | undefined {
    const row = db.prepare(`
      SELECT id, component, status, message, metadata_json, recorded_at as recordedAt
      FROM system_health 
      WHERE component = ?
      ORDER BY recorded_at DESC
      LIMIT 1
    `).get(component) as any;

    if (!row) return undefined;

    return {
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null
    };
  }

  getAll(): SystemHealthRecord[] {
    const rows = db.prepare(`
      SELECT id, component, status, message, metadata_json, recorded_at as recordedAt
      FROM system_health 
      WHERE id IN (
        SELECT MAX(id) FROM system_health GROUP BY component
      )
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null
    }));
  }

  getHistory(component: string, limit: number = 10): SystemHealthRecord[] {
    const rows = db.prepare(`
      SELECT id, component, status, message, metadata_json, recorded_at as recordedAt
      FROM system_health 
      WHERE component = ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `).all(component, limit) as any[];

    return rows.map(row => ({
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null
    }));
  }

  deleteOlderThan(date: string): number {
    const result = db.prepare('DELETE FROM system_health WHERE recorded_at < ?').run(date);
    return result.changes;
  }
}

export const systemHealthRepo = new SystemHealthRepo();
