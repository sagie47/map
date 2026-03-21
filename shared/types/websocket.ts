export const WEBSOCKET_EVENTS = {
  CONNECTION_STATUS: 'connection.status',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_UPDATED: 'incident.updated',
  INCIDENT_RESOLVED: 'incident.resolved',
  RECEIVER_UPDATED: 'receiver.updated',
  EVENT_INGESTED: 'event.ingested',
  NOTIFICATION_RAISED: 'notification.raised',
  NOTIFICATION_SENT: 'notification.sent',
} as const;

export type WebSocketMessageType = typeof WEBSOCKET_EVENTS[keyof typeof WEBSOCKET_EVENTS];

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType | string;
  payload: T;
}
