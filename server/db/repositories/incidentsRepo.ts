import { db } from '../client';
import { INCIDENT_STATUSES } from '../../../shared/constants/statuses';

export class IncidentsRepo {
  getById(id: string) {
    return db.prepare(`
      SELECT i.*, b.external_identifier, b.beacon_type, b.protocol, b.frequency, b.registration_region
      FROM incidents i
      LEFT JOIN beacons b ON i.beacon_id = b.id
      WHERE i.id = ?
    `).get(id) as any;
  }

  listWithFilters() {
    return db.prepare(`
      SELECT i.*, b.external_identifier, b.beacon_type, b.protocol
      FROM incidents i
      LEFT JOIN beacons b ON i.beacon_id = b.id
      WHERE i.source != 'simulator'
      ORDER BY i.last_seen_at DESC
    `).all();
  }

  findActiveByBeaconId(beaconId: string) {
    return db.prepare(`
      SELECT * FROM incidents 
      WHERE beacon_id = ? AND status NOT IN (?, ?)
    `).get(beaconId, INCIDENT_STATUSES.RESOLVED, INCIDENT_STATUSES.DISMISSED) as any;
  }

  createIncident(incident: any) {
    db.prepare(`
      INSERT INTO incidents (id, beacon_id, status, domain_type, first_seen_at, last_seen_at, estimated_lat, estimated_lng, confidence_score, severity, source_type, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incident.id,
      incident.beacon_id,
      incident.status,
      incident.domain_type,
      incident.first_seen_at,
      incident.last_seen_at,
      incident.estimated_lat,
      incident.estimated_lng,
      incident.confidence_score,
      incident.severity,
      incident.source_type,
      incident.source || 'simulator'
    );
  }

  updateIncident(id: string, updates: any) {
    db.prepare(`
      UPDATE incidents 
      SET last_seen_at = ?, estimated_lat = ?, estimated_lng = ?, confidence_score = ?, status = ?
      WHERE id = ?
    `).run(
      updates.last_seen_at,
      updates.estimated_lat,
      updates.estimated_lng,
      updates.confidence_score,
      updates.status,
      id
    );
  }

  resolveIncident(id: string, reason: string) {
    db.prepare(`UPDATE incidents SET status = ?, resolution_reason = ? WHERE id = ?`)
      .run(INCIDENT_STATUSES.RESOLVED, reason, id);
  }

  ensureBeaconExists(beacon: any) {
    const exists = db.prepare('SELECT id FROM beacons WHERE id = ?').get(beacon.id);
    if (!exists) {
      db.prepare(`
        INSERT INTO beacons (id, external_identifier, beacon_type, protocol, frequency, registration_region, is_test_device)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        beacon.id,
        beacon.external_identifier,
        beacon.beacon_type,
        beacon.protocol,
        beacon.frequency,
        beacon.registration_region,
        beacon.is_test_device
      );
    }
  }

  getAnalyticsStats() {
    const activeIncidents = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE status = '${INCIDENT_STATUSES.ACTIVE}'`).get() as { count: number };
    const totalIncidents = db.prepare('SELECT COUNT(*) as count FROM incidents').get() as { count: number };
    const falsePositives = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE resolution_reason = 'false_positive'`).get() as { count: number };
    const domainStats = db.prepare('SELECT domain_type as name, COUNT(*) as value FROM incidents GROUP BY domain_type').all();

    return {
      activeIncidents: activeIncidents.count,
      totalIncidents: totalIncidents.count,
      falsePositives: falsePositives.count,
      domainStats
    };
  }
}

export const incidentsRepo = new IncidentsRepo();
