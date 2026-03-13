import { incidentsRepo } from '../../db/repositories/incidentsRepo';
import { signalEventsRepo } from '../../db/repositories/signalEventsRepo';
import { calculateConfidence } from './confidenceEngine';
import { determineStatus, isTransitionAllowed } from './incidentStateMachine';
import { INCIDENT_STATUSES, INCIDENT_SEVERITIES, IncidentStatus } from '../../../shared/constants/statuses';

export interface NormalizedDetection {
  beaconId: string;
  domainType: string;
  isTest: boolean;
  lat: number;
  lng: number;
  receiverId: string;
  signalStrength: number;
  detectedAt: string;
}

export interface DomainEvent {
  type: string;
  payload: any;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export class IncidentService {
  public processDetection(detection: NormalizedDetection): DomainEvent[] {
    const events: DomainEvent[] = [];
    
    // 1. Find existing active incident for this beacon
    const existingIncident = incidentsRepo.findActiveByBeaconId(detection.beaconId);

    let incidentId: string;
    let isNew = false;

    if (!existingIncident) {
      // Create new incident
      incidentId = `INC-${generateId()}`;
      isNew = true;
      
      // Ensure beacon exists
      incidentsRepo.ensureBeaconExists({
        id: detection.beaconId,
        external_identifier: `HEX-${generateId().toUpperCase()}`,
        beacon_type: detection.domainType,
        protocol: 'EPIRB',
        frequency: '406 MHz',
        registration_region: 'US',
        is_test_device: detection.isTest ? 1 : 0
      });

      const initialStatus = determineStatus(INCIDENT_STATUSES.CANDIDATE, 0.4, detection.isTest);

      incidentsRepo.createIncident({
        id: incidentId,
        beacon_id: detection.beaconId,
        status: initialStatus,
        domain_type: detection.domainType,
        first_seen_at: detection.detectedAt,
        last_seen_at: detection.detectedAt,
        estimated_lat: detection.lat,
        estimated_lng: detection.lng,
        confidence_score: 0.4,
        severity: detection.isTest ? INCIDENT_SEVERITIES.LOW : INCIDENT_SEVERITIES.HIGH,
        source_type: 'satellite'
      });

      const incident = incidentsRepo.getById(incidentId);
      events.push({ type: 'INCIDENT_CREATED', payload: incident });
    } else {
      incidentId = existingIncident.id;
    }

    // 2. Persist signal event
    const eventId = `EVT-${generateId()}`;
    signalEventsRepo.createSignalEvent({
      id: eventId,
      incident_id: incidentId,
      receiver_station_id: detection.receiverId,
      event_type: 'detection',
      signal_strength: detection.signalStrength,
      lat: detection.lat,
      lng: detection.lng,
      detected_at: detection.detectedAt
    });

    const eventData = signalEventsRepo.getSignalEventWithReceiver(eventId);
    events.push({ type: 'EVENT_INGESTED', payload: eventData });

    // 3. Update incident confidence and position
    const stats = signalEventsRepo.getIncidentStats(incidentId);

    const newConfidence = calculateConfidence({
      receiverCount: stats.receiverCount,
      detectionCount: stats.detectionCount,
      avgSignalStrength: stats.avgSignalStrength,
      domainType: detection.domainType
    });

    const currentIncident = incidentsRepo.getById(incidentId);
    let newStatus = currentIncident.status as IncidentStatus;
    
    const proposedStatus = determineStatus(currentIncident.status as IncidentStatus, newConfidence, detection.isTest);
    
    if (isTransitionAllowed(currentIncident.status as IncidentStatus, proposedStatus)) {
      newStatus = proposedStatus;
    }

    incidentsRepo.updateIncident(incidentId, {
      last_seen_at: detection.detectedAt,
      estimated_lat: stats.avgLat,
      estimated_lng: stats.avgLng,
      confidence_score: newConfidence,
      status: newStatus
    });

    const updatedIncident = incidentsRepo.getById(incidentId);
    
    // Only emit INCIDENT_UPDATED if it's not a brand new incident (we already emitted CREATED)
    // Actually, even if it's new, we just updated it with the first detection.
    // So we should emit UPDATED. Or maybe just emit CREATED with the updated data?
    // Let's emit UPDATED always, or maybe only if not new.
    // If it's new, the CREATED event had initial data, now it has updated data.
    // Let's just emit UPDATED.
    events.push({ type: 'INCIDENT_UPDATED', payload: updatedIncident });

    return events;
  }

  public resolveIncident(incidentId: string, reason: string): DomainEvent[] {
    const events: DomainEvent[] = [];
    const incident = incidentsRepo.getById(incidentId);
    if (!incident) return events;

    if (isTransitionAllowed(incident.status as IncidentStatus, INCIDENT_STATUSES.RESOLVED)) {
      incidentsRepo.resolveIncident(incidentId, reason);
      
      const updated = incidentsRepo.getById(incidentId);
      events.push({ type: 'INCIDENT_RESOLVED', payload: updated });
    }

    return events;
  }
}

export const incidentService = new IncidentService();
