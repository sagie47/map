import { SignalEvent } from '../../../shared/types/events';

export function toTimelineDto(row: any): SignalEvent {
  return {
    id: row.id,
    incidentId: row.incident_id,
    receiverStationId: row.receiver_station_id,
    stationCode: row.station_code,
    stationName: row.station_name,
    detectedAt: row.detected_at,
    signalStrength: row.signal_strength,
    lat: row.lat,
    lng: row.lng,
    eventType: row.event_type,
    metadataJson: row.metadata_json,
  };
}
