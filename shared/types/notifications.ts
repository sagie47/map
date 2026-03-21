export enum NotificationType {
  HIGH_CONFIDENCE = 'high_confidence',
  INCIDENT_RESOLVED = 'incident_resolved',
  INCIDENT_CREATED = 'incident_created',
  INCIDENT_DISMISSED = 'incident_dismissed',
  TEST_ALERT = 'test_alert'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app'
}

export interface Notification {
  id: string;
  incidentId: string;
  type: NotificationType;
  channel: NotificationChannel;
  sentAt: string;
  payload: NotificationPayload;
  readAt?: string;
  status: NotificationStatus;
}

export interface NotificationPayload {
  incidentId: string;
  beaconId: string;
  beaconType: string;
  severity: string;
  confidenceScore: number;
  location?: {
    lat: number;
    lng: number;
  };
  message?: string;
  metadata?: Record<string, any>;
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read'
}
