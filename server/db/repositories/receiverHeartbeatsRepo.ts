import { db } from '../client';

export class ReceiverHeartbeatsRepo {
  insertHeartbeat(heartbeat: any) {
    db.prepare(`
      INSERT INTO receiver_heartbeats (id, receiver_station_id, status, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(
      heartbeat.id,
      heartbeat.receiver_station_id,
      heartbeat.status,
      heartbeat.timestamp
    );
  }

  getLatestHeartbeatPerReceiver() {
    return db.prepare(`
      SELECT * FROM receiver_heartbeats
      WHERE id IN (
        SELECT id FROM receiver_heartbeats
        GROUP BY receiver_station_id
        HAVING MAX(timestamp)
      )
    `).all();
  }

  getHeartbeatHistory(receiverId: string, limit: number = 100) {
    return db.prepare(`
      SELECT * FROM receiver_heartbeats
      WHERE receiver_station_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(receiverId, limit);
  }
}

export const receiverHeartbeatsRepo = new ReceiverHeartbeatsRepo();
