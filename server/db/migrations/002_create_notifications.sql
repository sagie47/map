-- Migration: 002_create_notifications
-- Description: Create notifications table for alerting and notification system
-- Created: 2026-03-21

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  incident_id TEXT,
  notification_type TEXT NOT NULL,
  destination TEXT NOT NULL,
  sent_at DATETIME NOT NULL,
  payload_json TEXT,
  status TEXT DEFAULT 'pending',
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(incident_id) REFERENCES incidents(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_incident_id ON notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
