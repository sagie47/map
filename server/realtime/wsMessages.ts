import { DomainEvent } from '../domain/incidents/incidentService';
import { broadcaster } from './broadcaster';
import { WEBSOCKET_EVENTS } from '../../shared/types/websocket';
import { toIncidentDto } from '../api/dto/incidentDto';
import { toReceiverDto } from '../api/dto/receiverDto';
import { toTimelineDto } from '../api/dto/timelineDto';

export function mapAndBroadcast(events: DomainEvent[]) {
  events.forEach(event => {
    let outboundType = event.type;
    let outboundPayload = event.payload;
    
    switch (event.type) {
      case 'INCIDENT_CREATED':
        outboundType = WEBSOCKET_EVENTS.INCIDENT_CREATED;
        outboundPayload = toIncidentDto(event.payload);
        break;
      case 'INCIDENT_UPDATED':
        outboundType = WEBSOCKET_EVENTS.INCIDENT_UPDATED;
        outboundPayload = toIncidentDto(event.payload);
        break;
      case 'INCIDENT_RESOLVED':
        outboundType = WEBSOCKET_EVENTS.INCIDENT_RESOLVED;
        outboundPayload = toIncidentDto(event.payload);
        break;
      case 'RECEIVER_UPDATED':
        outboundType = WEBSOCKET_EVENTS.RECEIVER_UPDATED;
        outboundPayload = toReceiverDto(event.payload);
        break;
      case 'EVENT_INGESTED':
        outboundType = WEBSOCKET_EVENTS.EVENT_INGESTED;
        outboundPayload = toTimelineDto(event.payload);
        break;
      default:
        outboundType = event.type;
    }

    broadcaster.broadcast(outboundType, outboundPayload);
  });
}
