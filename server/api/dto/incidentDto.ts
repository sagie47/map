import { Incident } from '../../../shared/types/incidents';

export function toIncidentDto(row: any): Incident {
  return {
    id: row.id,
    beaconId: row.beacon_id,
    domainType: row.domain_type,
    status: row.status,
    severity: row.severity,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    estimatedLat: row.estimated_lat,
    estimatedLng: row.estimated_lng,
    confidenceScore: row.confidence_score,
    protocol: row.protocol,
    sourceType: row.source_type,
    resolutionReason: row.resolution_reason,
    externalIdentifier: row.external_identifier,
    beaconType: row.beacon_type,
  };
}
