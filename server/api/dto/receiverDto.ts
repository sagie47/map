import { ReceiverStation } from '../../../shared/types/receivers';

export function toReceiverDto(row: any): ReceiverStation {
  return {
    id: row.id,
    stationCode: row.station_code,
    stationName: row.station_name,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    lastHeartbeatAt: row.last_heartbeat_at,
    packetDelayMs: row.packet_delay_ms,
    region: row.region,
  };
}
