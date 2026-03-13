import { receiversRepo } from '../../db/repositories/receiversRepo';
import { receiverHeartbeatsRepo } from '../../db/repositories/receiverHeartbeatsRepo';
import { NormalizedHeartbeat } from '../../ingestion/normalization/normalizeHeartbeat';
import { DomainEvent } from '../incidents/incidentService';

export class ReceiverHealthService {
  public processHeartbeat(heartbeat: NormalizedHeartbeat): DomainEvent[] {
    const exists = receiversRepo.getById(heartbeat.receiverId);
    
    if (exists) {
      receiversRepo.updateReceiverStatus(heartbeat.receiverId, heartbeat.status, heartbeat.timestamp);
    } else {
      receiversRepo.createReceiver({
        id: heartbeat.receiverId,
        station_code: `UNKNOWN-${heartbeat.receiverId}`,
        station_name: `Unknown Station ${heartbeat.receiverId}`,
        lat: 0,
        lng: 0,
        region: 'UNKNOWN',
        status: heartbeat.status,
        last_heartbeat_at: heartbeat.timestamp,
        packet_delay_ms: 0
      });
    }

    receiverHeartbeatsRepo.insertHeartbeat({
      id: `HB-${Math.random().toString(36).substring(2, 9)}`,
      receiver_station_id: heartbeat.receiverId,
      status: heartbeat.status,
      timestamp: heartbeat.timestamp
    });

    const receiver = receiversRepo.getById(heartbeat.receiverId);

    return [
      { type: 'RECEIVER_UPDATED', payload: receiver }
    ];
  }
}

export const receiverHealthService = new ReceiverHealthService();
