import { normalizeDetection } from '../../ingestion/normalization/normalizeDetection';
import { normalizeHeartbeat } from '../../ingestion/normalization/normalizeHeartbeat';
import { incidentService, DomainEvent } from '../incidents/incidentService';
import { receiverHealthService } from '../receivers/receiverHealthService';

export class EventIngestionService {
  public ingestDetection(rawInput: any): DomainEvent[] {
    const normalized = normalizeDetection(rawInput);
    return incidentService.processDetection(normalized);
  }

  public ingestHeartbeat(rawInput: any): DomainEvent[] {
    const normalized = normalizeHeartbeat(rawInput);
    return receiverHealthService.processHeartbeat(normalized);
  }
}

export const eventIngestionService = new EventIngestionService();
