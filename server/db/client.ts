import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { RECEIVER_STATUSES } from '../../shared/constants/statuses';

const dbPath = path.join(process.cwd(), 'beaconscope.db');
export const db = new Database(dbPath);

function configureDatabase() {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (process.env.RUNTIME_MODE === 'live') {
    db.pragma('synchronous = NORMAL');
  }
}

export function initDb() {
  configureDatabase();
  const schema = fs.readFileSync(path.join(process.cwd(), 'server', 'schema.sql'), 'utf-8');
  db.exec(schema);
  
  // Seed initial receiver stations if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM receiver_stations').get() as { count: number };
  if (count.count === 0) {
    const insertStation = db.prepare(`
      INSERT INTO receiver_stations (id, station_code, station_name, lat, lng, region, status, last_heartbeat_at, packet_delay_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    insertStation.run('RS-001', 'US-EAST-1', 'Cape Hatteras Station', 35.23, -75.52, 'US-EAST', RECEIVER_STATUSES.ONLINE, now, 12);
    insertStation.run('RS-002', 'US-WEST-1', 'Point Reyes Station', 38.0, -123.0, 'US-WEST', RECEIVER_STATUSES.ONLINE, now, 15);
    insertStation.run('RS-003', 'EU-NORTH-1', 'Shetland Station', 60.3, -1.2, 'EU-NORTH', RECEIVER_STATUSES.ONLINE, now, 22);
    insertStation.run('RS-004', 'EU-SOUTH-1', 'Malta Station', 35.9, 14.4, 'EU-SOUTH', RECEIVER_STATUSES.DEGRADED, now, 150);
    insertStation.run('RS-005', 'AP-SOUTH-1', 'Hobart Station', -42.8, 147.3, 'AP-SOUTH', RECEIVER_STATUSES.OFFLINE, new Date(Date.now() - 3600000).toISOString(), 0);
  }
}
