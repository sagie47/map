CREATE TABLE IF NOT EXISTS beacons (
  id TEXT PRIMARY KEY,
  external_identifier TEXT,
  beacon_type TEXT,
  protocol TEXT,
  frequency TEXT,
  registration_region TEXT,
  is_test_device BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  beacon_id TEXT,
  status TEXT,
  domain_type TEXT,
  first_seen_at DATETIME,
  last_seen_at DATETIME,
  estimated_lat REAL,
  estimated_lng REAL,
  confidence_score REAL,
  severity TEXT,
  source_type TEXT,
  resolution_reason TEXT,
  FOREIGN KEY(beacon_id) REFERENCES beacons(id)
);

CREATE TABLE IF NOT EXISTS receiver_stations (
  id TEXT PRIMARY KEY,
  station_code TEXT,
  station_name TEXT,
  lat REAL,
  lng REAL,
  region TEXT,
  status TEXT,
  last_heartbeat_at DATETIME,
  packet_delay_ms INTEGER
);

CREATE TABLE IF NOT EXISTS signal_events (
  id TEXT PRIMARY KEY,
  incident_id TEXT,
  receiver_station_id TEXT,
  event_type TEXT,
  signal_strength REAL,
  lat REAL,
  lng REAL,
  detected_at DATETIME,
  metadata_json TEXT,
  FOREIGN KEY(incident_id) REFERENCES incidents(id),
  FOREIGN KEY(receiver_station_id) REFERENCES receiver_stations(id)
);

CREATE TABLE IF NOT EXISTS receiver_heartbeats (
  id TEXT PRIMARY KEY,
  receiver_station_id TEXT,
  status TEXT,
  timestamp DATETIME,
  FOREIGN KEY(receiver_station_id) REFERENCES receiver_stations(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  incident_id TEXT,
  notification_type TEXT,
  destination TEXT,
  sent_at DATETIME,
  status TEXT,
  payload_json TEXT,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);
