export type InternalEventType = 
  | 'BEACON_DETECTED'
  | 'RECEIVER_HEARTBEAT'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'INCIDENT_RESOLVED';

export interface SignalEvent {
  id: string;
  incidentId: string;
  receiverStationId: string;
  stationCode?: string;
  stationName?: string;
  detectedAt: string;
  signalStrength: number;
  lat: number;
  lng: number;
  eventType: InternalEventType | string;
  metadataJson?: string;
}
