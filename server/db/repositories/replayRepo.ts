import { db } from '../client';

export interface ReplayEvent {
  id: string;
  incidentId: string;
  receiverStationId: string;
  eventType: string;
  signalStrength: number;
  lat: number;
  lng: number;
  detectedAt: string;
  stationName?: string;
  stationCode?: string;
}

export interface ReplayData {
  incidentId: string;
  events: ReplayEvent[];
  transitions: ReplayTransition[];
}

export interface ReplayTransition {
  id: string;
  incidentId: string;
  fromStatus: string | null;
  toStatus: string;
  confidenceScore: number | null;
  reason: string | null;
  transitionedAt: string;
}

export class ReplayRepo {
  getIncidentReplayData(incidentId: string): ReplayData | null {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
    if (!incident) return null;

    const events = db.prepare(`
      SELECT e.id, e.incident_id as incidentId, e.receiver_station_id as receiverStationId,
             e.event_type as eventType, e.signal_strength as signalStrength,
             e.lat, e.lng, e.detected_at as detectedAt,
             r.station_name as stationName, r.station_code as stationCode
      FROM signal_events e
      LEFT JOIN receiver_stations r ON e.receiver_station_id = r.id
      WHERE e.incident_id = ?
      ORDER BY e.detected_at ASC
    `).all(incidentId) as ReplayEvent[];

    const transitions = db.prepare(`
      SELECT id, incident_id as incidentId, from_status as fromStatus,
             to_status as toStatus, confidence_score as confidenceScore,
             reason, transitioned_at as transitionedAt
      FROM incident_state_transitions
      WHERE incident_id = ?
      ORDER BY transitioned_at ASC
    `).all(incidentId) as ReplayTransition[];

    return {
      incidentId,
      events,
      transitions
    };
  }

  getEventTimeline(incidentId: string): { event: ReplayEvent; transition: ReplayTransition | null }[] {
    const data = this.getIncidentReplayData(incidentId);
    if (!data) return [];

    const timeline: { event: ReplayEvent; transition: ReplayTransition | null }[] = [];
    let transitionIndex = 0;

    for (const event of data.events) {
      let transition = null;
      
      while (
        transitionIndex < data.transitions.length &&
        new Date(data.transitions[transitionIndex].transitionedAt) <= new Date(event.detectedAt)
      ) {
        transition = data.transitions[transitionIndex];
        transitionIndex++;
      }

      timeline.push({ event, transition });
    }

    return timeline;
  }
}

export const replayRepo = new ReplayRepo();
