/// <reference types="vite/client" />
import { lazy, Suspense, useEffect, useRef, useState, useMemo, useCallback } from "react";
import Map, { Source, Layer, MapRef, NavigationControl, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Incident } from "@shared/types/incidents";
import { ReceiverStation } from "@shared/types/receivers";
import { INCIDENT_STATUSES, RECEIVER_STATUSES, INCIDENT_SEVERITIES } from "@shared/constants/statuses";
import { Layers } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function formatTrackAge(timestamp?: string) {
  if (!timestamp) return "unknown";
  const ageMs = Date.now() - Date.parse(timestamp);
  if (!Number.isFinite(ageMs) || ageMs < 0) return "unknown";
  const minutes = Math.round(ageMs / 60000);
  if (minutes < 1) return "live";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

function formatTrackState(type: string, speed?: number) {
  if (speed == null) return type === "vessel" ? "tracking" : "live";
  if (type === "vessel") {
    if (speed < 1) return "adrift";
    if (speed < 8) return "slow transit";
    return "underway";
  }
  if (type === "aircraft") {
    if (speed < 60) return "holding";
    return "in flight";
  }
  return "tracking";
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
const DrawControl = lazy(() => import("./DrawControl").then((module) => ({ default: module.DrawControl })));
const INTERACTIVE_LAYER_IDS: string[] = [
  "incidents-layer",
  "incidents-cluster",
  "incidents-cluster-count",
  "receivers-layer",
  "vessels-layer",
  "vessels-icon-layer",
  "vessels-cluster",
  "vessels-cluster-count",
  "aircraft-layer",
  "aircraft-cluster",
  "aircraft-cluster-count",
  "satellites-layer",
  "satellites-cluster",
  "satellites-cluster-count",
];

const HOVER_LAYER_IDS = new Set([
  "incidents-layer",
  "vessels-layer",
  "vessels-icon-layer",
  "receivers-layer",
  "aircraft-layer",
  "satellites-layer",
]);

interface AlertData {
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

interface PathPoint {
  lat: number;
  lng: number;
  timestamp: string;
  receiverId?: string;
}

export function MapView({
  incidents,
  receivers,
  vessels = [],
  aircraft = [],
  satellites = [],
  alerts = [],
  pathHistory = [],
  probableSearchArea = null,
  interceptRoutes = null,
  primaryAssetId = null,
  searchAreaLabel = null,
  leftPanelOffsetPx = 0,
  rightPanelOffsetPx = 0,
  selectedIncidentId,
  onSelectIncident,
}: {
  incidents: Incident[];
  receivers: ReceiverStation[];
  vessels?: VesselPositionUpdate[];
  aircraft?: VesselPositionUpdate[];
  satellites?: VesselPositionUpdate[];
  alerts?: AlertData[];
  pathHistory?: PathPoint[];
  probableSearchArea?: GeoJSON.Feature<GeoJSON.Polygon> | null;
  interceptRoutes?: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  primaryAssetId?: string | null;
  searchAreaLabel?: string | null;
  leftPanelOffsetPx?: number;
  rightPanelOffsetPx?: number;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const hoverFeatureKeyRef = useRef<string | null>(null);
  const cursorRef = useRef<string>("");

  const [hoverInfo, setHoverInfo] = useState<{
    lngLat: { lng: number, lat: number };
    feature: any;
  } | null>(null);
  const [pinnedInfo, setPinnedInfo] = useState<{
    lngLat: { lng: number, lat: number };
    feature: any;
  } | null>(null);

  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [mapZoom, setMapZoom] = useState(2.5);
  const [layerVisibility, setLayerVisibility] = useState({
    incidents: true,
    vessels: true,
    receivers: true,
    heatmap: true,
    aircraft: true,
    satellites: true,
    searchArea: true,
    alerts: true,
  });

  const [searchAreaPolygon, setSearchAreaPolygon] = useState<GeoJSON.Feature | null>(null);

  const toggleLayer = (layer: keyof typeof layerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const incidentPoints = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: incidents.map(incident => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [incident.estimatedLng, incident.estimatedLat] },
      properties: {
        id: incident.id,
        status: incident.status,
        severity: incident.severity,
        confidenceScore: incident.confidenceScore,
        type: "incident"
      }
    }))
  }), [incidents]);

  const receiverPoints = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: receivers.map(receiver => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [receiver.lng, receiver.lat] },
      properties: {
        id: receiver.id,
        name: receiver.stationName,
        code: receiver.stationCode,
        status: receiver.status,
        type: "receiver"
      }
    }))
  }), [receivers]);

  const vesselPoints = useMemo(() => {
    let visibleVessels = vessels;
    
    // Viewport culling at higher zoom levels
    if (mapBounds) {
      const [[minLng, minLat], [maxLng, maxLat]] = mapBounds;
      visibleVessels = vessels.filter(v => 
        v.lat >= minLat && v.lat <= maxLat && v.lng >= minLng && v.lng <= maxLng
      );
    }
    if (mapZoom < 4) {
      visibleVessels = visibleVessels.slice(0, 2500);
    } else {
      visibleVessels = visibleVessels.slice(0, 1200);
    }
    
    return {
      type: "FeatureCollection" as const,
      features: visibleVessels.map(vessel => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [vessel.lng, vessel.lat] as [number, number] },
        properties: {
          id: vessel.assetId,
          name: vessel.metadata?.vesselName as string || vessel.metadata?.callsign as string || `ID ${vessel.assetId}`,
          callsign: vessel.metadata?.callsign as string,
          destination: vessel.metadata?.destination as string,
          flag: vessel.metadata?.flag as string || vessel.metadata?.country as string,
          speed: vessel.speed,
          heading: vessel.heading,
          timestamp: vessel.timestamp,
          source: vessel.source || vessel.assetType,
          type: "vessel"
        }
      }))
    };
  }, [vessels, mapBounds, mapZoom]);

  const aircraftPoints = useMemo(() => {
    let visibleAircraft = aircraft;
    
    if (mapBounds) {
      const [[minLng, minLat], [maxLng, maxLat]] = mapBounds;
      visibleAircraft = aircraft.filter(a => 
        a.lat >= minLat && a.lat <= maxLat && a.lng >= minLng && a.lng <= maxLng
      );
    }
    visibleAircraft = visibleAircraft.slice(0, mapZoom < 4 ? 1800 : 900);
    
    return {
      type: "FeatureCollection" as const,
      features: visibleAircraft.map(ac => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [ac.lng, ac.lat] as [number, number] },
        properties: {
          id: ac.assetId,
          name: ac.metadata?.callsign as string || `Aircraft ${ac.assetId}`,
          speed: ac.speed,
          heading: ac.heading,
          altitude: ac.altitude,
          source: ac.source || ac.assetType,
          type: "aircraft"
        }
      }))
    };
  }, [aircraft, mapBounds, mapZoom]);

  const satellitePoints = useMemo(() => {
    let visibleSatellites = satellites;
    
    if (mapBounds) {
      const [[minLng, minLat], [maxLng, maxLat]] = mapBounds;
      visibleSatellites = satellites.filter(s => 
        s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng
      );
    }
    visibleSatellites = visibleSatellites.slice(0, mapZoom < 4 ? 1200 : 700);
    
    return {
      type: "FeatureCollection" as const,
      features: visibleSatellites.map(sat => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [sat.lng, sat.lat] as [number, number] },
        properties: {
          id: sat.assetId,
          name: sat.metadata?.satelliteName as string || sat.metadata?.name as string || `Sat ${sat.assetId}`,
          altitude: sat.altitude,
          source: sat.source || sat.assetType,
          type: "satellite"
        }
      }))
    };
  }, [satellites, mapBounds, mapZoom]);

  const alertFeatures = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: alerts
      .filter(a => a.polygon && a.polygon.length > 0)
      .map(alert => ({
        type: "Feature" as const,
        geometry: {
          type: "MultiPolygon" as const,
          coordinates: [alert.polygon!]
        },
        properties: {
          id: alert.alertId,
          type: alert.type,
          severity: alert.severity,
          headline: alert.headline,
          source: alert.source
        }
      }))
  }), [alerts]);

  const alertPointFeatures = useMemo(() => {
    const features = alerts
      .filter(a => a.coordinates && !a.polygon)
      .map(alert => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: alert.coordinates!
        },
        properties: {
          id: alert.alertId,
          type: alert.type,
          severity: alert.severity,
          headline: alert.headline,
          source: alert.source
        }
      }));
    return {
      type: "FeatureCollection" as const,
      features
    };
  }, [alerts]);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId],
  );

  const pathHistoryGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: pathHistory.length > 1 ? [{
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: pathHistory.map(p => [p.lng, p.lat])
      },
      properties: {}
    }] : []
  }), [pathHistory]);

  const primaryAssetFeature = useMemo(() => {
    if (!primaryAssetId) {
      return null;
    }

    const asset = [...vessels, ...aircraft, ...satellites].find((item) => item.assetId === primaryAssetId);
    if (!asset) {
      return null;
    }

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [asset.lng, asset.lat] as [number, number],
          },
          properties: {
            id: asset.assetId,
            label: "PRIMARY ASSET",
          },
        },
      ],
    };
  }, [primaryAssetId, vessels, aircraft, satellites]);

  const searchAreaLabelPoint = useMemo(() => {
    if (!selectedIncident || !searchAreaLabel) {
      return null;
    }

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [selectedIncident.estimatedLng, selectedIncident.estimatedLat] as [number, number],
          },
          properties: {
            label: searchAreaLabel,
          },
        },
      ],
    };
  }, [selectedIncident, searchAreaLabel]);

  useEffect(() => {
    if (selectedIncident && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedIncident.estimatedLng, selectedIncident.estimatedLat],
        zoom: 6,
        duration: 1500,
      });
    }
  }, [selectedIncident]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const timer = window.setTimeout(() => {
      map.resize();

      if (selectedIncident) {
        map.easeTo({
          center: [selectedIncident.estimatedLng, selectedIncident.estimatedLat],
          offset: [(leftPanelOffsetPx - rightPanelOffsetPx) / 2, 0],
          duration: 350,
        });
        return;
      }

      const mapbox = map.getMap();
      const center = mapbox.getCenter();
      map.easeTo({
        center: [center.lng, center.lat],
        offset: [(leftPanelOffsetPx - rightPanelOffsetPx) / 2, 0],
        duration: 350,
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [leftPanelOffsetPx, rightPanelOffsetPx, selectedIncidentId, selectedIncident]);

  const updateViewportMetrics = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds = map.getBounds();
    const nextBounds: [[number, number], [number, number]] = [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()]
    ];
    const nextZoom = map.getZoom();

    setMapBounds((prevBounds) => {
      if (
        prevBounds &&
        prevBounds[0][0] === nextBounds[0][0] &&
        prevBounds[0][1] === nextBounds[0][1] &&
        prevBounds[1][0] === nextBounds[1][0] &&
        prevBounds[1][1] === nextBounds[1][1]
      ) {
        return prevBounds;
      }
      return nextBounds;
    });

    setMapZoom((prevZoom) => (Math.abs(prevZoom - nextZoom) < 0.01 ? prevZoom : nextZoom));
  }, []);

  const setCanvasCursor = useCallback((canvas: HTMLCanvasElement, value: string) => {
    if (cursorRef.current === value) return;
    canvas.style.cursor = value;
    cursorRef.current = value;
  }, []);

  const clearHover = useCallback((canvas?: HTMLCanvasElement) => {
    if (hoverFeatureKeyRef.current !== null) {
      hoverFeatureKeyRef.current = null;
      setHoverInfo(null);
    }

    if (canvas) {
      setCanvasCursor(canvas, "");
    }
  }, [setCanvasCursor]);

  const popupInfo = pinnedInfo ?? hoverInfo;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-red-500 p-6 text-center">
        <div className="hud-panel p-6 border-red-500/50 max-w-lg">
          <h2 className="text-lg font-mono tracking-widest uppercase mb-4 text-red-400">Missing Mapbox Token</h2>
          <p className="text-zinc-400 text-sm font-mono leading-relaxed">
            Please add your Mapbox Access Token to the <code className="text-zinc-200 bg-[#1f1f1f] px-1 py-0.5 rounded">.env</code> file under <code className="text-zinc-200 bg-[#1f1f1f] px-1 py-0.5 rounded">VITE_MAPBOX_ACCESS_TOKEN</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="hud-panel p-3 pointer-events-auto bg-[#0a0a0a] border border-[#1f1f1f] rounded-none">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">/MAP_LEGEND</h4>
          <div className="space-y-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            <div className="flex items-center"><div className="w-2 h-2 bg-[#ef4444] border border-white mr-2 shadow-[0_0_8px_#ef4444]"></div> ACTIVE INCIDENT</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#22c55e] border border-white mr-2 shadow-[0_0_8px_#22c55e]"></div> RESOLVED</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#f97316] border border-white mr-2 shadow-[0_0_8px_#f97316]"></div> TEST BEACON</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#3b82f6] border border-white mr-2 shadow-[0_0_8px_#3b82f6]"></div> RECEIVER STATION</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#a855f7] rounded-full border border-white mr-2 shadow-[0_0_8px_#a855f7]"></div> LIVE VESSEL</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#22d3ee] rounded-full border border-white mr-2 shadow-[0_0_8px_#22d3ee]"></div> LIVE AIRCRAFT</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#f59e0b] rounded-full border border-white mr-2 shadow-[0_0_8px_#f59e0b]"></div> SATELLITES</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full border border-white mr-2 shadow-[0_0_8px_#ef4444]"></div> HEATMAP CLUSTER</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#f97316] border border-[#f97316] mr-2" style={{ borderRadius: '2px' }}></div> SEARCH AREA</div>
            <div className="flex items-center"><div className="w-5 h-[2px] bg-[#22d3ee] mr-2 shadow-[0_0_8px_#22d3ee]"></div> INTERCEPT VECTOR</div>
          </div>
        </div>
      </div>

      {/* Map Style Controls */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className="relative flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              className="hud-panel p-2 flex items-center justify-center bg-[#0a0a0a] border border-[#1f1f1f] hover:bg-[#111] transition-colors text-zinc-300"
              title="Map Style"
            >
              <Layers className="w-5 h-5" />
            </button>
          
            {showStyleMenu && (
              <div className="absolute top-full left-0 mt-2 hud-panel p-1 bg-[#0a0a0a] border border-[#1f1f1f] flex flex-col gap-1 w-32 pointer-events-auto">
                <button
                  onClick={() => { setMapStyle("standard"); setShowStyleMenu(false); }}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors",
                    mapStyle === "standard" ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  STANDARD 3D
                </button>
                <button
                  onClick={() => { setMapStyle("satellite"); setShowStyleMenu(false); }}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors",
                    mapStyle === "satellite" ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  SATELLITE
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="hud-panel p-2 flex items-center justify-center bg-[#0a0a0a] border border-[#1f1f1f] hover:bg-[#111] transition-colors text-zinc-300"
              title="Layer Toggles"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          
            {showLayerMenu && (
              <div className="absolute top-full left-0 mt-2 hud-panel p-1 bg-[#0a0a0a] border border-[#1f1f1f] flex flex-col gap-1 w-40 pointer-events-auto">
                <button
                  onClick={() => toggleLayer('incidents')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.incidents ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>INCIDENTS</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.incidents ? '#ef4444' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('vessels')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.vessels ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>VESSELS</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.vessels ? '#a855f7' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('aircraft')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.aircraft ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>AIRCRAFT</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.aircraft ? '#22d3ee' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('satellites')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.satellites ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>SATELLITES</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.satellites ? '#f59e0b' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('searchArea')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.searchArea ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>SEARCH AREA</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.searchArea ? '#f97316' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('receivers')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.receivers ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>RECEIVERS</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.receivers ? '#3b82f6' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('heatmap')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.heatmap ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>HEATMAP</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.heatmap ? '#f97316' : '#333' }} />
                </button>
                <button
                  onClick={() => toggleLayer('alerts')}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-widest transition-colors flex items-center justify-between",
                    layerVisibility.alerts ? "bg-[#1f1f1f] text-white" : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  )}
                >
                  <span>ALERTS</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layerVisibility.alerts ? '#ef4444' : '#333' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 10,
          latitude: 35,
          zoom: 2.5,
          pitch: 0,
          bearing: 0,
        }}
        reuseMaps={true}
        mapStyle={mapStyle === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/dark-v11"}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        terrain={mapStyle === "satellite" ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
        onLoad={updateViewportMetrics}
        onMoveEnd={updateViewportMetrics}
        onClick={(e) => {
          const feature = e.features?.[0];
          // Handle Cluster Clicking
          if (feature?.layer.id === "incidents-cluster") {
            const clusterId = feature.properties?.cluster_id;
            const mapboxSource = mapRef.current?.getSource("incidents") as any;
            mapboxSource.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err) return;
              mapRef.current?.easeTo({
                center: [e.lngLat.lng, e.lngLat.lat],
                zoom: zoom,
                duration: 500
              });
            });
            return;
          }

          if (feature?.layer.id === "incidents-layer" && feature.properties?.id) {
            setPinnedInfo(null);
            onSelectIncident(feature.properties.id);
            return;
          }

          if (feature && HOVER_LAYER_IDS.has(feature.layer.id)) {
            setPinnedInfo({
              lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
              feature,
            });
            return;
          }

          setPinnedInfo(null);
        }}
        onMouseMove={(e) => {
          const feature = e.features?.[0];
          const canvas = e.target.getCanvas();

          if (feature && HOVER_LAYER_IDS.has(feature.layer.id)) {
            const identity = feature.properties?.id ?? "";
            const key = `${feature.layer.id}:${identity}`;

            if (hoverFeatureKeyRef.current !== key) {
              hoverFeatureKeyRef.current = key;
              setHoverInfo({
                lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
                feature: feature
              });
            }
            setCanvasCursor(canvas, "pointer");
            return;
          }

          if (feature && feature.layer.id === "incidents-cluster") {
            clearHover(canvas);
            setCanvasCursor(canvas, "pointer");
            return;
          }

          clearHover(canvas);
        }}
        onMouseLeave={(e) => {
          if (!pinnedInfo) {
            clearHover(e.target.getCanvas());
          }
        }}
      >
        <NavigationControl position="top-right" />
        <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />

        {/* Selected Incident Uncertainty Area */}
        {selectedIncident && (
          <Source id="incident-uncertainty" type="geojson" data={{
            type: "Feature",
            geometry: { type: "Point", coordinates: [selectedIncident.estimatedLng, selectedIncident.estimatedLat] },
            properties: {}
          }}>
            <Layer
              id="incident-uncertainty-layer"
              type="circle"
              paint={{
                "circle-color": "#ef4444",
                "circle-opacity": 0.2,
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  2, (1 - selectedIncident.confidenceScore) * 20,
                  8, (1 - selectedIncident.confidenceScore) * 100,
                  14, (1 - selectedIncident.confidenceScore) * 500
                ],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ef4444",
              }}
            />
          </Source>
        )}

        {probableSearchArea && layerVisibility.searchArea && (
          <Source id="sar-search-area" type="geojson" data={probableSearchArea}>
            <Layer
              id="sar-search-area-glow"
              type="line"
              paint={{
                "line-color": "#fb923c",
                "line-width": 8,
                "line-opacity": 0.16,
              }}
            />
            <Layer
              id="sar-search-area-fill"
              type="fill"
              paint={{
                "fill-color": "#f97316",
                "fill-opacity": 0.18,
              }}
            />
            <Layer
              id="sar-search-area-line"
              type="line"
              paint={{
                "line-color": "#f97316",
                "line-width": 3,
                "line-opacity": 0.95,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {searchAreaLabelPoint && (
          <Source id="sar-search-label" type="geojson" data={searchAreaLabelPoint}>
            <Layer
              id="sar-search-label-layer"
              type="symbol"
              layout={{
                "text-field": ["get", "label"],
                "text-size": 11,
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-offset": [0, -2.4],
                "text-anchor": "bottom",
                "text-max-width": 20,
              }}
              paint={{
                "text-color": "#fcd34d",
                "text-halo-color": "#050505",
                "text-halo-width": 1.4,
              }}
            />
          </Source>
        )}

        {interceptRoutes && interceptRoutes.features.length > 0 && (
          <Source id="sar-intercepts" type="geojson" data={interceptRoutes}>
            <Layer
              id="sar-intercepts-line"
              type="line"
              paint={{
                "line-color": [
                  "match",
                  ["get", "priority"],
                  "primary", "#67e8f9",
                  "secondary", "#38bdf8",
                  "#1d4ed8"
                ],
                "line-width": [
                  "match",
                  ["get", "priority"],
                  "primary", 3,
                  "secondary", 2.5,
                  2
                ],
                "line-opacity": 0.88,
                "line-dasharray": [1, 1.5],
              }}
            />
            <Layer
              id="sar-intercepts-label"
              type="symbol"
              layout={{
                "symbol-placement": "line-center",
                "text-field": ["get", "label"],
                "text-size": 10,
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-rotation-alignment": "map",
                "text-letter-spacing": 0.08,
              }}
              paint={{
                "text-color": "#d5fbff",
                "text-halo-color": "#03131a",
                "text-halo-width": 1.2,
              }}
            />
          </Source>
        )}

        {primaryAssetFeature && (
          <Source id="primary-asset" type="geojson" data={primaryAssetFeature}>
            <Layer
              id="primary-asset-halo"
              type="circle"
              paint={{
                "circle-color": "#22d3ee",
                "circle-radius": 14,
                "circle-opacity": 0.16,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#67e8f9",
                "circle-stroke-opacity": 0.55,
              }}
            />
            <Layer
              id="primary-asset-core"
              type="circle"
              paint={{
                "circle-color": "#67e8f9",
                "circle-radius": 6.5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
            <Layer
              id="primary-asset-label"
              type="symbol"
              layout={{
                "text-field": ["get", "label"],
                "text-size": 10,
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-offset": [0, 1.8],
                "text-anchor": "top",
              }}
              paint={{
                "text-color": "#d5fbff",
                "text-halo-color": "#03131a",
                "text-halo-width": 1.2,
              }}
            />
          </Source>
        )}
        
        {/* Receivers */}
        {layerVisibility.receivers && (
          <Source id="receivers" type="geojson" data={receiverPoints}>
            <Layer
              id="receivers-layer"
              type="circle"
              paint={{
                "circle-color": "#3b82f6",
                "circle-radius": 5,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        )}

        {/* Vessels (AIS & OpenSky) - Clustered for performance */}
        {layerVisibility.vessels && (
          <Source id="vessels" type="geojson" data={vesselPoints} cluster={true} clusterMaxZoom={10} clusterRadius={40}>
            {/* Cluster circles */}
            <Layer
              id="vessels-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": "#7c3aed",
                "circle-radius": ["step", ["get", "point_count"], 12, 50, 18, 200, 24],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#a855f7",
                "circle-opacity": 0.85,
              }}
            />
            {/* Cluster count */}
            <Layer
              id="vessels-cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 11,
              }}
              paint={{ "text-color": "#ffffff" }}
            />
            {/* Individual vessels */}
            <Layer
              id="vessels-layer"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": "#a855f7",
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
                "circle-opacity": 0.9,
              }}
            />
            <Layer
              id="vessels-icon-layer"
              type="symbol"
              minzoom={6}
              filter={["!", ["has", "point_count"]]}
              layout={{
                "text-field": "⛴",
                "text-size": [
                  "interpolate", ["linear"], ["zoom"],
                  6, 10,
                  10, 12,
                  14, 14
                ],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
              }}
              paint={{
                "text-color": "#f5f3ff",
                "text-halo-color": "#4c1d95",
                "text-halo-width": 1.2,
              }}
            />
          </Source>
        )}

        {/* Aircraft (OpenSky) - Clustered for performance */}
        {layerVisibility.aircraft && (
          <Source id="aircraft" type="geojson" data={aircraftPoints} cluster={true} clusterMaxZoom={8} clusterRadius={50}>
            {/* Cluster circles */}
            <Layer
              id="aircraft-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": "#0891b2",
                "circle-radius": ["step", ["get", "point_count"], 12, 50, 18, 200, 24],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#22d3ee",
                "circle-opacity": 0.85,
              }}
            />
            {/* Cluster count */}
            <Layer
              id="aircraft-cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 11,
              }}
              paint={{ "text-color": "#ffffff" }}
            />
            {/* Individual aircraft */}
            <Layer
              id="aircraft-layer"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": "#22d3ee",
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
                "circle-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {/* Satellites (CelesTrak) - Clustered for performance */}
        {layerVisibility.satellites && (
          <Source id="satellites" type="geojson" data={satellitePoints} cluster={true} clusterMaxZoom={6} clusterRadius={50}>
            {/* Cluster circles - gold color for satellites */}
            <Layer
              id="satellites-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": "#b45309",
                "circle-radius": ["step", ["get", "point_count"], 12, 50, 18, 200, 24],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#f59e0b",
                "circle-opacity": 0.85,
              }}
            />
            {/* Cluster count */}
            <Layer
              id="satellites-cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 11,
              }}
              paint={{ "text-color": "#ffffff" }}
            />
            {/* Individual satellites */}
            <Layer
              id="satellites-layer"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": "#f59e0b",
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
                "circle-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {/* Weather Alerts (NWS) - Polygon alerts */}
        {layerVisibility.alerts && (
          <Source id="alerts" type="geojson" data={alertFeatures}>
            <Layer
              id="alerts-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "match", ["get", "severity"],
                  "Extreme", "#dc2626",
                  "Severe", "#f97316",
                  "Moderate", "#eab308",
                  "Minor", "#22c55e",
                  "#666666"
                ],
                "fill-opacity": 0.25,
              }}
            />
            <Layer
              id="alerts-line"
              type="line"
              paint={{
                "line-color": [
                  "match", ["get", "severity"],
                  "Extreme", "#dc2626",
                  "Severe", "#f97316",
                  "Moderate", "#eab308",
                  "Minor", "#22c55e",
                  "#666666"
                ],
                "line-width": 2,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* Point-based Alerts (Earthquakes) */}
        {layerVisibility.alerts && (
          <Source id="alerts-points" type="geojson" data={alertPointFeatures}>
            <Layer
              id="alerts-points-circle"
              type="circle"
              paint={{
                "circle-color": [
                  "match", ["get", "severity"],
                  "critical", "#dc2626",
                  "high", "#f97316",
                  "medium", "#eab308",
                  "low", "#22c55e",
                  "#666666"
                ],
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  2, 4,
                  6, 8,
                  10, 12
                ],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {/* Incidents -> Heatmap + Clusters + Points */}
        {layerVisibility.incidents && (
          <Source 
            id="incidents" 
            type="geojson" 
            data={incidentPoints}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            {/* Heatmap Layer */}
            {layerVisibility.heatmap && (
              <Layer
                id="incidents-heat"
                type="heatmap"
                maxzoom={9}
                paint={{
                  "heatmap-weight": ["interpolate", ["linear"], ["get", "point_count"], 1, 0, 10, 1],
                  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0, "rgba(239, 68, 68, 0)",
                    0.2, "rgb(239, 68, 68)",
                    0.5, "rgb(249, 115, 22)",
                    1, "rgb(234, 179, 8)"
                  ],
                  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
                  "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0]
                }}
              />
            )}

            {/* Cluster Layer */}
            <Layer
              id="incidents-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": ["step", ["get", "point_count"], "#ef4444", 25, "#f97316", 100, "#eab308"],
                "circle-radius": ["step", ["get", "point_count"], 15, 25, 20, 100, 30],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
                "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1]
              }}
            />
            
            {/* Unclustered Point Layer */}
            <Layer
              id="incidents-layer"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": [
                  "match",
                  ["get", "status"],
                  INCIDENT_STATUSES.RESOLVED, "#22c55e",
                  [
                    "match",
                    ["get", "severity"],
                    INCIDENT_SEVERITIES.LOW, "#f97316",
                    "#ef4444"
                  ]
                ],
                "circle-radius": [
                  "case",
                  ["==", ["get", "id"], selectedIncidentId || ""], 8,
                  6
                ],
                "circle-stroke-width": [
                  "case",
                  ["==", ["get", "id"], selectedIncidentId || ""], 2,
                  1
                ],
                "circle-stroke-color": "#fff",
                "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1]
              }}
            />
          </Source>
        )}

        {/* Incident Path History */}
        {selectedIncidentId && pathHistory.length > 1 && (
          <Source id="path-history" type="geojson" data={pathHistoryGeoJSON}>
            <Layer
              id="path-history-line"
              type="line"
              paint={{
                "line-color": "#f97316",
                "line-width": 2,
                "line-opacity": 0.7,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {popupInfo && (
          <Popup
            longitude={popupInfo.lngLat.lng}
            latitude={popupInfo.lngLat.lat}
            closeButton={!!pinnedInfo}
            onClose={() => setPinnedInfo(null)}
            className="hud-popup z-[9999]"
            maxWidth="320px"
            anchor="bottom"
            offset={15}
          >
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] text-zinc-100 font-mono overflow-hidden">
              {/* Dynamic Header based on type */}
              <div className="px-3 py-2 bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ backgroundColor: popupInfo.feature.properties.type === 'vessel' ? '#a855f7' : popupInfo.feature.properties.type === 'aircraft' ? '#22d3ee' : '#3b82f6' }}
                  ></div>
                  <span className="text-[9px] uppercase tracking-widest text-[#666]">
                    {popupInfo.feature.properties.type === 'vessel' ? 'LIVE VESSEL' : popupInfo.feature.properties.type === 'aircraft' ? 'LIVE AIRCRAFT' : popupInfo.feature.properties.type === 'receiver' ? 'RECEIVER STATION' : 'INCIDENT'}
                  </span>
                </div>
                <h3 className="text-[13px] font-bold text-zinc-100 mt-1 truncate">
                  {popupInfo.feature.properties.name || popupInfo.feature.properties.id}
                </h3>
              </div>

              {/* Dynamic Stats based on type */}
              <div className="grid grid-cols-2 gap-px bg-[#1a1a1a]">
                {/* ID for vessel/aircraft */}
                {(popupInfo.feature.properties.type === 'vessel' || popupInfo.feature.properties.type === 'aircraft') && (
                  <>
                    <div className="bg-[#0a0a0a] p-2">
                      <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">
                        {popupInfo.feature.properties.type === 'aircraft' ? 'ICAO24' : 'MMSI'}
                      </div>
                      <div className="text-[11px] text-zinc-300 font-medium">{popupInfo.feature.properties.id}</div>
                    </div>
                    <div className="bg-[#0a0a0a] p-2">
                      <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">SOURCE</div>
                      <div className="text-[11px] uppercase" style={{ color: popupInfo.feature.properties.type === 'vessel' ? '#a855f7' : '#22d3ee' }}>
                        {popupInfo.feature.properties.source}
                      </div>
                    </div>
                  </>
                )}
                {popupInfo.feature.properties.type === 'vessel' && popupInfo.feature.properties.callsign && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">CALLSIGN</div>
                    <div className="text-[11px] text-zinc-300">{popupInfo.feature.properties.callsign}</div>
                  </div>
                )}
                {popupInfo.feature.properties.type === 'vessel' && popupInfo.feature.properties.flag && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">FLAG</div>
                    <div className="text-[11px] text-zinc-300">{popupInfo.feature.properties.flag}</div>
                  </div>
                )}
                {/* Speed for vessel/aircraft */}
                {popupInfo.feature.properties.speed !== undefined && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">
                      {popupInfo.feature.properties.type === 'aircraft' ? 'GROUND SPEED' : 'SPEED'}
                    </div>
                    <div className="text-[11px] text-zinc-300">
                      {popupInfo.feature.properties.speed.toFixed(1)} <span className="text-[#555]">kn</span>
                    </div>
                  </div>
                )}
                {(popupInfo.feature.properties.type === 'vessel' || popupInfo.feature.properties.type === 'aircraft') && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">TRACK STATE</div>
                    <div className="text-[11px] uppercase text-zinc-300">
                      {formatTrackState(popupInfo.feature.properties.type, popupInfo.feature.properties.speed)}
                    </div>
                  </div>
                )}
                {/* Altitude for aircraft */}
                {popupInfo.feature.properties.altitude !== undefined && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">ALTITUDE</div>
                    <div className="text-[11px] text-zinc-300">
                      {popupInfo.feature.properties.altitude.toFixed(0)} <span className="text-[#555]">ft</span>
                    </div>
                  </div>
                )}
                {/* Heading for vessel/aircraft */}
                {popupInfo.feature.properties.heading !== undefined && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">HEADING</div>
                    <div className="text-[11px] text-zinc-300">
                      {popupInfo.feature.properties.heading.toFixed(0)}<span className="text-[#555]"> deg</span>
                    </div>
                  </div>
                )}
                {(popupInfo.feature.properties.type === 'vessel' || popupInfo.feature.properties.type === 'aircraft') && popupInfo.feature.properties.timestamp && (
                  <div className="bg-[#0a0a0a] p-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">LAST UPDATE</div>
                    <div className="text-[11px] text-zinc-300">
                      {formatTrackAge(popupInfo.feature.properties.timestamp)} ago
                    </div>
                  </div>
                )}
                {popupInfo.feature.properties.type === 'vessel' && popupInfo.feature.properties.destination && (
                  <div className="bg-[#0a0a0a] p-2 col-span-2">
                    <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">DESTINATION</div>
                    <div className="text-[11px] text-zinc-300 truncate">{popupInfo.feature.properties.destination}</div>
                  </div>
                )}
                {/* Receiver-specific */}
                {popupInfo.feature.properties.type === 'receiver' && (
                  <>
                    <div className="bg-[#0a0a0a] p-2">
                      <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">CODE</div>
                      <div className="text-[11px] text-zinc-300">{popupInfo.feature.properties.code}</div>
                    </div>
                    <div className="bg-[#0a0a0a] p-2">
                      <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">STATUS</div>
                      <div className={`text-[11px] ${popupInfo.feature.properties.status === 'online' ? 'text-[#22c55e]' : 'text-red-500'}`}>
                        {popupInfo.feature.properties.status?.toUpperCase()}
                      </div>
                    </div>
                  </>
                )}
                {/* Incident-specific */}
                {popupInfo.feature.properties.type === 'incident' && (
                  <>
                    <div className="bg-[#0a0a0a] p-2">
                      <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">STATUS</div>
                      <div className="text-[11px] text-zinc-300">{popupInfo.feature.properties.status}</div>
                    </div>
                    <div className="bg-[#0a0a0a] p-2">
                      <div className="text-[8px] uppercase tracking-wider text-[#555] mb-0.5">SEVERITY</div>
                      <div className={`text-[11px] ${
                        popupInfo.feature.properties.severity === 'high' ? 'text-red-500' : 
                        popupInfo.feature.properties.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {popupInfo.feature.properties.severity?.toUpperCase()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Coordinates */}
              <div className="px-3 py-1.5 border-t border-[#1a1a1a] bg-[#050505]">
                <div className="text-[8px] uppercase tracking-wider text-[#444]">POSITION</div>
                <div className="text-[10px] text-[#555] font-mono mt-0.5">
                  {popupInfo.lngLat.lat.toFixed(5)} deg, {popupInfo.lngLat.lng.toFixed(5)} deg
                </div>
              </div>
            </div>
          </Popup>
        )}

        {/* Search Area Drawing */}
        {layerVisibility.searchArea && (
          <Suspense fallback={null}>
            <DrawControl
              position="top-left"
              onCreate={(e) => {
                if (e.features.length > 0) {
                  setSearchAreaPolygon(e.features[0]);
                }
              }}
              onUpdate={(e) => {
                if (e.features.length > 0) {
                  setSearchAreaPolygon(e.features[0]);
                }
              }}
              onDelete={() => {
                setSearchAreaPolygon(null);
              }}
            />
          </Suspense>
        )}

        {/* Search Area Display */}
        {searchAreaPolygon && layerVisibility.searchArea && (
          <Source id="search-area" type="geojson" data={searchAreaPolygon}>
            <Layer
              id="search-area-fill"
              type="fill"
              paint={{
                "fill-color": "#f97316",
                "fill-opacity": 0.15,
              }}
            />
            <Layer
              id="search-area-line"
              type="line"
              paint={{
                "line-color": "#f97316",
                "line-width": 2,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
