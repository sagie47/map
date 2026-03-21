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

  /**
   * Query recent signal events for a beacon across all its incidents within a time window.
   * Returns unique receiver IDs that detected this beacon.
   */
  getRecentReceiversByBeaconId(beaconId: string, minutesBack: number = 5): string[] {
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();
    
    const results = db.prepare(`
      SELECT DISTINCT se.receiver_station_id
      FROM signal_events se
      INNER JOIN incidents i ON se.incident_id = i.id
      WHERE i.beacon_id = ?
        AND se.detected_at >= ?
        AND se.event_type = 'detection'
    `).all(beaconId, cutoffTime) as any[];
    
    return results.map(r => r.receiver_station_id);
  }
}

export const signalEventsRepo = new SignalEventsRepo();
