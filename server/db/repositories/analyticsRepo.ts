import { db } from '../client';

export interface AnalyticsStats {
  activeIncidents: number;
  totalIncidents: number;
  falsePositives: number;
  resolvedIncidents: number;
  domainStats: { name: string; value: number }[];
}

export interface TimeSeriesData {
  name: string;
  incidents: number;
  resolved: number;
}

export interface IncidentMetrics {
  avgDetectionsPerIncident: number;
  multiReceiverConfirmationRate: number;
  meanTimeToHighConfidence: number;
  meanTimeToResolution: number;
}

export class AnalyticsRepo {
  getIncidentStats(): AnalyticsStats {
    const activeIncidents = db.prepare(`
      SELECT COUNT(*) as count FROM incidents WHERE status = 'active'
    `).get() as { count: number };

    const totalIncidents = db.prepare('SELECT COUNT(*) as count FROM incidents').get() as { count: number };

    const falsePositives = db.prepare(`
      SELECT COUNT(*) as count FROM incidents WHERE resolution_reason = 'false_positive'
    `).get() as { count: number };

    const resolvedIncidents = db.prepare(`
      SELECT COUNT(*) as count FROM incidents WHERE status = 'resolved'
    `).get() as { count: number };

    const domainStats = db.prepare(`
      SELECT domain_type as name, COUNT(*) as value 
      FROM incidents 
      GROUP BY domain_type
    `).all() as { name: string; value: number }[];

    return {
      activeIncidents: activeIncidents.count,
      totalIncidents: totalIncidents.count,
      falsePositives: falsePositives.count,
      resolvedIncidents: resolvedIncidents.count,
      domainStats
    };
  }

  getTimeSeries(days: number = 7): TimeSeriesData[] {
    const now = new Date();
    const data: TimeSeriesData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const nextDateStr = new Date(d.getTime() + 86400000).toISOString().split('T')[0];

      const incidents = db.prepare(`
        SELECT COUNT(*) as count FROM incidents 
        WHERE first_seen_at >= ? AND first_seen_at < ?
      `).get(dateStr, nextDateStr) as { count: number };

      const resolved = db.prepare(`
        SELECT COUNT(*) as count FROM incidents 
        WHERE status = 'resolved' AND last_seen_at >= ? AND last_seen_at < ?
      `).get(dateStr, nextDateStr) as { count: number };

      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        incidents: incidents.count,
        resolved: resolved.count
      });
    }

    return data;
  }

  getIncidentMetrics(): IncidentMetrics {
    const avgDetections = db.prepare(`
      SELECT AVG(event_count) as avg FROM (
        SELECT incident_id, COUNT(*) as event_count 
        FROM signal_events 
        GROUP BY incident_id
      )
    `).get() as { avg: number | null };

    const multiReceiver = db.prepare(`
      SELECT COUNT(DISTINCT incident_id) as count
      FROM (
        SELECT incident_id, COUNT(DISTINCT receiver_station_id) as rc
        FROM signal_events
        GROUP BY incident_id
        HAVING rc > 1
      )
    `).get() as { count: number };

    const totalIncidents = db.prepare('SELECT COUNT(*) as count FROM incidents').get() as { count: number };

    const highConfidenceTime = db.prepare(`
      SELECT AVG(time_to_high_conf) as avg FROM (
        SELECT 
          i.id,
          (julianday(t.transitioned_at) - julianday(i.first_seen_at)) * 24 * 60 as time_to_high_conf
        FROM incidents i
        JOIN incident_state_transitions t ON i.id = t.incident_id
        WHERE t.to_status = 'high_confidence'
      )
    `).get() as { avg: number | null };

    const resolutionTime = db.prepare(`
      SELECT AVG(time_to_resolve) as avg FROM (
        SELECT 
          i.id,
          (julianday(i.last_seen_at) - julianday(i.first_seen_at)) * 24 * 60 as time_to_resolve
        FROM incidents i
        WHERE i.status = 'resolved'
      )
    `).get() as { avg: number | null };

    return {
      avgDetectionsPerIncident: avgDetections.avg || 0,
      multiReceiverConfirmationRate: totalIncidents.count > 0 
        ? (multiReceiver.count / totalIncidents.count) * 100 
        : 0,
      meanTimeToHighConfidence: highConfidenceTime.avg || 0,
      meanTimeToResolution: resolutionTime.avg || 0
    };
  }

  getReceiverStats() {
    const totalReceivers = db.prepare('SELECT COUNT(*) as count FROM receiver_stations').get() as { count: number };
    
    const onlineReceivers = db.prepare(`
      SELECT COUNT(*) as count FROM receiver_stations WHERE status = 'online'
    `).get() as { count: number };

    const degradedReceivers = db.prepare(`
      SELECT COUNT(*) as count FROM receiver_stations WHERE status = 'degraded'
    `).get() as { count: number };

    const offlineReceivers = db.prepare(`
      SELECT COUNT(*) as count FROM receiver_stations WHERE status = 'offline'
    `).get() as { count: number };

    const avgLatency = db.prepare(`
      SELECT AVG(packet_delay_ms) as avg FROM receiver_stations WHERE packet_delay_ms > 0
    `).get() as { avg: number | null };

    return {
      totalReceivers: totalReceivers.count,
      onlineReceivers: onlineReceivers.count,
      degradedReceivers: degradedReceivers.count,
      offlineReceivers: offlineReceivers.count,
      receiverUptime: totalReceivers.count > 0 
        ? (onlineReceivers.count / totalReceivers.count) * 100 
        : 0,
      avgLatency: avgLatency.avg || 0
    };
  }
}

export const analyticsRepo = new AnalyticsRepo();
