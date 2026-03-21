import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIncidents, fetchIncident, fetchIncidentEvents, fetchRecentEvents } from './api';
import { useSocketSubscription } from '../connection/hooks';
import { WEBSOCKET_EVENTS } from "@shared/types/websocket";
import { useNotificationStore } from '../notifications/store';
import { THRESHOLDS } from "@shared/constants/thresholds";
import { INCIDENT_STATUSES } from "@shared/constants/statuses";
import { Incident } from "@shared/types/incidents";
import { SignalEvent } from "@shared/types/events";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

interface VesselPositionUpdate {
  source: string;
  assetId: string;
  assetType: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function useVessels(): VesselPositionUpdate[] {
  const [revision, setRevision] = useState(0);
  const entityMapRef = useRef<Map<string, VesselPositionUpdate>>(new Map());
  const bufferRef = useRef<Record<string, VesselPositionUpdate>>({});
  const isFlushingRef = useRef(false);
  const retentionMs = 15 * 60 * 1000;
  const maxItems = 2000;

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.POSITION_UPDATE) {
      if (payload.assetType === 'vessel' || payload.assetType === 'aircraft' || payload.assetType === 'satellite') {
        bufferRef.current[payload.assetId] = payload;
      }
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (isFlushingRef.current) return;
      const buffered = Object.keys(bufferRef.current);
      if (buffered.length === 0) return;
      
      isFlushingRef.current = true;
      const updates = { ...bufferRef.current };
      bufferRef.current = {};
      const entities = entityMapRef.current;
      let changed = false;
      const cutoff = Date.now() - retentionMs;

      for (const update of Object.values(updates)) {
        const previous = entities.get(update.assetId);
        if (
          !previous ||
          previous.timestamp !== update.timestamp ||
          previous.lat !== update.lat ||
          previous.lng !== update.lng ||
          previous.heading !== update.heading ||
          previous.speed !== update.speed ||
          previous.altitude !== update.altitude
        ) {
          entities.set(update.assetId, update);
          changed = true;
        }
      }

      for (const [id, item] of entities) {
        const ts = Date.parse(item.timestamp);
        if (Number.isFinite(ts) && ts < cutoff) {
          entities.delete(id);
          changed = true;
        }
      }

      if (entities.size > maxItems) {
        const trimmed = Array.from(entities.entries())
          .sort((a, b) => Date.parse(b[1].timestamp) - Date.parse(a[1].timestamp))
          .slice(0, maxItems);
        entities.clear();
        for (const [id, value] of trimmed) {
          entities.set(id, value);
        }
        changed = true;
      }

      if (changed) {
        setRevision(v => v + 1);
      }
      isFlushingRef.current = false;
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => Array.from(entityMapRef.current.values()), [revision]);
}

export function useAircraft(): VesselPositionUpdate[] {
  const vessels = useVessels();
  return vessels.filter(v => v.assetType === 'aircraft');
}

export function useLiveVessels(): VesselPositionUpdate[] {
  const vessels = useVessels();
  return vessels.filter(v => v.assetType === 'vessel');
}

export function useSatellites(): VesselPositionUpdate[] {
  const vessels = useVessels();
  return vessels.filter(v => v.assetType === 'satellite');
}

export interface AlertData {
  source: string;
  alertId: string;
  type: string;
  severity: string;
  certainty: string;
  urgency: string;
  headline: string;
  description: string;
  polygon?: number[][][];
  coordinates?: [number, number];
  timestamp: string;
  expires: string;
}

export function useAlerts(): AlertData[] {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const maxAlerts = 250;

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.ALERT_UPSERT) {
      setAlerts(prev => {
        const now = Date.now();
        const idx = prev.findIndex(a => a.alertId === payload.alertId);
        let next: AlertData[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = payload;
        } else {
          next = [payload, ...prev];
        }
        const active = next.filter(alert => {
          const expiresAt = Date.parse(alert.expires);
          return Number.isFinite(expiresAt) ? expiresAt > now - 5 * 60 * 1000 : true;
        });
        return active.slice(0, maxAlerts);
      });
    }
  });

  return alerts;
}

export interface PathPoint {
  lat: number;
  lng: number;
  timestamp: string;
  receiverId?: string;
}

export function useIncidentPath(incidentId: string | null): PathPoint[] {
  const [path, setPath] = useState<PathPoint[]>([]);

  useEffect(() => {
    if (!incidentId) {
      setPath([]);
      return;
    }

    // Fetch existing events for this incident
    fetch(`/api/incidents/${incidentId}/events`)
      .then(res => res.json())
      .then(events => {
        const points = events.map((e: any) => ({
          lat: e.lat || e.estimatedLat,
          lng: e.lng || e.estimatedLng,
          timestamp: e.detectedAt || e.timestamp,
          receiverId: e.receiverStationId || e.receiverId,
        }));
        setPath(points);
      })
      .catch(() => setPath([]));
  }, [incidentId]);

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.EVENT_INGESTED && payload?.incidentId === incidentId) {
      setPath(prev => [...prev, {
        lat: payload.lat,
        lng: payload.lng,
        timestamp: payload.detectedAt,
        receiverId: payload.receiverStationId,
      }]);
    }
  });

  return path;
}

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

  const query = useQuery({
    queryKey: ['live-events'],
    queryFn: () => fetchRecentEvents(100),
    staleTime: 30000,
  });

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.EVENT_INGESTED) {
      queryClient.setQueryData<SignalEvent[]>(['live-events'], (old) => {
        if (!old) return [payload];
        const next = [payload, ...old.filter((event) => event.id !== payload.id)];
        return next.slice(0, 100);
      });
    }
  });

  return query;
}
