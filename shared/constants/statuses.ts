export const INCIDENT_STATUSES = {
  CANDIDATE: 'candidate',
  ACTIVE: 'active',
  HIGH_CONFIDENCE: 'high_confidence',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  TEST: 'test'
} as const;

export type IncidentStatus = typeof INCIDENT_STATUSES[keyof typeof INCIDENT_STATUSES];

export const RECEIVER_STATUSES = {
  ONLINE: 'online',
  DEGRADED: 'degraded',
  OFFLINE: 'offline'
} as const;

export type ReceiverStatus = typeof RECEIVER_STATUSES[keyof typeof RECEIVER_STATUSES];

export const INCIDENT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type IncidentSeverity = typeof INCIDENT_SEVERITIES[keyof typeof INCIDENT_SEVERITIES];
