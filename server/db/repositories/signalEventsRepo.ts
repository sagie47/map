import { db } from '../client';

export class SignalEventsRepo {
  createSignalEvent(event: any) {
    db.prepare(`
      INSERT INTO signal_events (id, incident_id, receiver_station_id, event_type, signal_strength, lat, lng, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.incident_id,
      event.receiver_station_id,
      event.event_type,
      event.signal_strength,
      event.lat,
      event.lng,
      event.detected_at
    );
  }

  getSignalEventWithReceiver(id: string) {
    return db.prepare(`
      SELECT e.*, r.station_name, r.station_code
      FROM signal_events e
      LEFT JOIN receiver_stations r ON e.receiver_station_id = r.id
      WHERE e.id = ?
    `).get(id) as any;
  }

  listByIncident(incidentId: string) {
    return db.prepare(`
      SELECT e.*, r.station_name, r.station_code
      FROM signal_events e
      LEFT JOIN receiver_stations r ON e.receiver_station_id = r.id
      WHERE e.incident_id = ?
      ORDER BY e.detected_at DESC
    `).all(incidentId);
  }

  listRecent(limit = 100) {
    return db.prepare(`
      SELECT e.*, r.station_name, r.station_code
      FROM signal_events e
      LEFT JOIN receiver_stations r ON e.receiver_station_id = r.id
      ORDER BY e.detected_at DESC
      LIMIT ?
    `).all(limit);
  }

  getIncidentStats(incidentId: string) {
    return db.prepare(`
      SELECT 
        COUNT(*) as detectionCount,
        COUNT(DISTINCT receiver_station_id) as receiverCount,
        AVG(signal_strength) as avgSignalStrength,
        AVG(lat) as avgLat,
        AVG(lng) as avgLng
      FROM signal_events
      WHERE incident_id = ?
    `).get(incidentId) as any;
  }
}

export const signalEventsRepo = new SignalEventsRepo();
