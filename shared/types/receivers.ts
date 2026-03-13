import { ReceiverStatus } from '../constants/statuses';

export interface ReceiverStation {
  id: string;
  stationCode: string;
  stationName: string;
  lat: number;
  lng: number;
  status: ReceiverStatus;
  lastHeartbeatAt: string;
  packetDelayMs: number;
  region: string;
}
