import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIncidents, fetchIncident, fetchIncidentEvents } from './api';
import { useSocketSubscription } from '../connection/hooks';
import { WEBSOCKET_EVENTS } from "@shared/types/websocket";
import { useNotificationStore } from '../notifications/store';
import { THRESHOLDS } from "@shared/constants/thresholds";
import { INCIDENT_STATUSES } from "@shared/constants/statuses";
import { Incident } from "@shared/types/incidents";
import { SignalEvent } from "@shared/types/events";

export function useIncidents() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);

  const query = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
  });

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.INCIDENT_CREATED) {
      queryClient.setQueryData<Incident[]>(['incidents'], (old) => {
        if (!old) return [payload];
        return [payload, ...old];
      });

      if (payload.severity === 'high') {
        addToast('New Distress Incident', `Incident ${payload.id} detected in ${payload.domainType} domain.`, 'error');
      } else {
        addToast('New Incident', `Incident ${payload.id} detected.`, 'info');
      }
    } else if (type === WEBSOCKET_EVENTS.INCIDENT_UPDATED || type === WEBSOCKET_EVENTS.INCIDENT_RESOLVED) {
      queryClient.setQueryData<Incident[]>(['incidents'], (old) => {
        if (!old) return [payload];
        const oldIncident = old.find((i) => i.id === payload.id);
        
        if (oldIncident && oldIncident.confidenceScore < THRESHOLDS.CONFIDENCE.HIGH && payload.confidenceScore >= THRESHOLDS.CONFIDENCE.HIGH) {
          addToast('High Confidence Alert', `Incident ${payload.id} reached high confidence.`, 'warning');
        }
        if (oldIncident && oldIncident.status !== INCIDENT_STATUSES.RESOLVED && payload.status === INCIDENT_STATUSES.RESOLVED) {
          addToast('Incident Resolved', `Incident ${payload.id} has been resolved.`, 'success');
        }
        
        return old.map((i) => (i.id === payload.id ? payload : i));
      });
    }
  });

  return query;
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => fetchIncident(id!),
    enabled: !!id,
  });
}

export function useIncidentEvents(id: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['incident-events', id],
    queryFn: () => fetchIncidentEvents(id!),
    enabled: !!id,
  });

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.EVENT_INGESTED && payload.incidentId === id) {
      queryClient.setQueryData<SignalEvent[]>(['incident-events', id], (old) => {
        if (!old) return [payload];
        return [payload, ...old].slice(0, 100);
      });
    }
  });

  return query;
}

export function useLiveEvents() {
  const queryClient = useQueryClient();

  // We can store a global list of recent events in react-query or zustand.
  // Let's use react-query for consistency, initialized to empty array.
  const query = useQuery({
    queryKey: ['live-events'],
    queryFn: () => [] as SignalEvent[],
    staleTime: Infinity,
  });

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.EVENT_INGESTED) {
      queryClient.setQueryData<SignalEvent[]>(['live-events'], (old) => {
        if (!old) return [payload];
        return [payload, ...old].slice(0, 100);
      });
    }
  });

  return query;
}
