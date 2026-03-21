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
  confirmed_by_receiver_ids TEXT,
  receiver_count INTEGER DEFAULT 0,
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
  notification_type TEXT NOT NULL,
  destination TEXT NOT NULL,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending',
  payload_json TEXT,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS incident_state_transitions (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  confidence_score REAL,
  reason TEXT,
  source_event_id TEXT,
  transitioned_at DATETIME NOT NULL,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_incident_id ON notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_transitions_incident_id ON incident_state_transitions(incident_id);
CREATE INDEX IF NOT EXISTS idx_transitions_incident_at ON incident_state_transitions(transitioned_at);

CREATE TABLE IF NOT EXISTS operator_actions (
  id TEXT PRIMARY KEY,
  incident_id TEXT,
  action_type TEXT NOT NULL,
  operator_id TEXT,
  payload_json TEXT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  details_json TEXT,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS system_health (
  id TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  metadata_json TEXT,
  recorded_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_history (
  id TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  source_name TEXT,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  triggered_at DATETIME NOT NULL,
  acknowledged_at DATETIME,
  resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_operator_actions_incident ON operator_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded ON system_health(recorded_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at);
