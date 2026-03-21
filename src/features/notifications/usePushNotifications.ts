import { useEffect, useRef } from "react";
import { useSocketSubscription } from "../connection/hooks";
import { WEBSOCKET_EVENTS } from "@shared/types/websocket";
import { useNotificationStore } from "./store";

export function usePushNotifications() {
  const addToast = useNotificationStore((state) => state.addToast);
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (permissionRequested.current) return;
    permissionRequested.current = true;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          addToast('Notifications Enabled', 'You will receive alerts for new incidents', 'success');
        }
      });
    }
  }, []);

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.INCIDENT_CREATED) {
      const incident = payload;
      const severity = incident.severity || 'unknown';
      const isHighSeverity = severity === 'high' || severity === 'critical';

      const title = `🚨 New Incident: ${incident.id}`;
      const message = `${incident.domainType?.toUpperCase() || 'BEACON'} - ${incident.status || 'detected'}`;
      const body = `Location: ${incident.estimatedLat?.toFixed(4)}, ${incident.estimatedLng?.toFixed(4)}`;

      addToast(title, message, isHighSeverity ? 'error' : 'warning');

      if ('Notification' in window && Notification.permission === 'granted') {
        if (isHighSeverity) {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: incident.id,
            requireInteraction: true,
          });
        } else {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: incident.id,
          });
        }
      }
    }
  });
}
