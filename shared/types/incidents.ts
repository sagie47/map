import { DomainType } from './domain';
import { IncidentStatus, IncidentSeverity } from '../constants/statuses';

export interface Incident {
  id: string;
  beaconId: string;
  domainType: DomainType;
  status: IncidentStatus;
  severity: IncidentSeverity;
  firstSeenAt: string;
  lastSeenAt: string;
  estimatedLat: number;
  estimatedLng: number;
  confidenceScore: number;
  protocol?: string;
  sourceType?: string;
  resolutionReason?: string;
  externalIdentifier?: string;
  beaconType?: string;
}
