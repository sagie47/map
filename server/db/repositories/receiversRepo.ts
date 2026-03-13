import { db } from '../client';
import { RECEIVER_STATUSES } from '../../../shared/constants/statuses';

export class ReceiversRepo {
  listReceivers() {
    return db.prepare('SELECT * FROM receiver_stations').all();
  }

  getById(id: string) {
    return db.prepare('SELECT * FROM receiver_stations WHERE id = ?').get(id) as any;
  }

  updateReceiverStatus(id: string, status: string, lastHeartbeatAt: string) {
    db.prepare(`
      UPDATE receiver_stations 
      SET status = ?, last_heartbeat_at = ?
      WHERE id = ?
    `).run(status, lastHeartbeatAt, id);
  }

  createReceiver(receiver: any) {
    db.prepare(`
      INSERT INTO receiver_stations (id, station_code, station_name, lat, lng, region, status, last_heartbeat_at, packet_delay_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiver.id,
      receiver.station_code,
      receiver.station_name,
      receiver.lat,
      receiver.lng,
      receiver.region,
      receiver.status,
      receiver.last_heartbeat_at,
      receiver.packet_delay_ms
    );
  }

  getAnalyticsStats() {
    const receiverUptime = db.prepare(`SELECT COUNT(*) as online, (SELECT COUNT(*) FROM receiver_stations) as total FROM receiver_stations WHERE status = '${RECEIVER_STATUSES.ONLINE}'`).get() as { online: number, total: number };
    return {
      receiverUptime: receiverUptime.total > 0 ? (receiverUptime.online / receiverUptime.total) * 100 : 0
    };
  }
}

export const receiversRepo = new ReceiversRepo();
