import { replayRepo, ReplayData, ReplayEvent, ReplayTransition } from '../../db/repositories/replayRepo';
import { incidentsRepo } from '../../db/repositories/incidentsRepo';

export interface ReplayResponse {
  incident: {
    id: string;
    beaconId: string;
    domainType: string;
    status: string;
    severity: string;
    firstSeenAt: string;
    lastSeenAt: string;
    estimatedLat: number;
    estimatedLng: number;
    confidenceScore: number;
    externalIdentifier?: string;
    beaconType?: string;
  };
  events: ReplayEvent[];
  transitions: ReplayTransition[];
  bounds: {
    startTime: string;
    endTime: string;
    totalDuration: number;
    eventCount: number;
  };
}

export class ReplayService {
  getReplayData(incidentId: string): ReplayResponse | null {
    const incident = incidentsRepo.getById(incidentId);
    if (!incident) return null;

    const replayData = replayRepo.getIncidentReplayData(incidentId);
    if (!replayData || replayData.events.length === 0) return null;

    const startTime = replayData.events[0].detectedAt;
    const endTime = replayData.events[replayData.events.length - 1].detectedAt;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return {
      incident: {
        id: incident.id,
        beaconId: incident.beacon_id,
        domainType: incident.domain_type,
        status: incident.status,
        severity: incident.severity,
        firstSeenAt: incident.first_seen_at,
        lastSeenAt: incident.last_seen_at,
        estimatedLat: incident.estimated_lat,
        estimatedLng: incident.estimated_lng,
        confidenceScore: incident.confidence_score,
        externalIdentifier: incident.external_identifier,
        beaconType: incident.beacon_type
      },
      events: replayData.events,
      transitions: replayData.transitions,
      bounds: {
        startTime,
        endTime,
        totalDuration: end - start,
        eventCount: replayData.events.length
      }
    };
  }

  getTimeline(incidentId: string): { event: ReplayEvent; transition: ReplayTransition | null }[] | null {
    const incident = incidentsRepo.getById(incidentId);
    if (!incident) return null;

    return replayRepo.getEventTimeline(incidentId);
  }

  isReplayable(incidentId: string): boolean {
    const data = replayRepo.getIncidentReplayData(incidentId);
    return data !== null && data.events.length > 0;
  }
}

export const replayService = new ReplayService();
