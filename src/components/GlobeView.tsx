import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup, type MapRef } from "react-map-gl/mapbox";
import { Compass, Globe, Layers, MapPinned, RotateCcw } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, RECEIVER_STATUSES } from "@shared/constants/statuses";
import type { Incident } from "@shared/types/incidents";
import type { ReceiverStation } from "@shared/types/receivers";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

type GlobeStyle = "dark" | "satellite";
type GlobeProjection = "globe" | "mercator";

function getIncidentColor(incident: Incident) {
  if (incident.status === INCIDENT_STATUSES.RESOLVED) {
    return "#22c55e";
  }

  if (incident.severity === INCIDENT_SEVERITIES.CRITICAL || incident.severity === INCIDENT_SEVERITIES.HIGH) {
    return "#ef4444";
  }

  if (incident.severity === INCIDENT_SEVERITIES.MEDIUM) {
    return "#f97316";
  }

  return "#eab308";
}

function getReceiverColor(receiver: ReceiverStation) {
  if (receiver.status === RECEIVER_STATUSES.ONLINE) {
    return "#38bdf8";
  }

  if (receiver.status === RECEIVER_STATUSES.DEGRADED) {
    return "#f97316";
  }

  return "#52525b";
}

export function GlobeView({
  incidents,
  receivers,
  selectedIncidentId,
  onSelectIncident,
}: {
  incidents: Incident[];
  receivers: ReceiverStation[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [style, setStyle] = useState<GlobeStyle>("dark");
  const [projection, setProjection] = useState<GlobeProjection>("mercator");
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [popup, setPopup] = useState<
    | { type: "incident"; incident: Incident }
    | { type: "receiver"; receiver: ReceiverStation }
    | null
  >(null);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewportMode = () => {
      const isCompact = mediaQuery.matches;
      setIsCompactViewport(isCompact);
      setProjection((current) => (isCompact ? "mercator" : current === "globe" ? current : "globe"));
    };

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);

    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!selectedIncident || !mapRef.current || !isMapReady) {
      return;
    }

    mapRef.current.flyTo({
      center: [selectedIncident.estimatedLng, selectedIncident.estimatedLat],
      zoom: 4.2,
      pitch: projection === "globe" ? 42 : 0,
      duration: 1600,
      essential: true,
    });
  }, [isMapReady, projection, selectedIncident]);

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    map.setProjection(projection);
    map.easeTo({
      pitch: projection === "globe" ? 42 : 0,
      bearing: 0,
      duration: 500,
      essential: true,
    });
  }, [isMapReady, projection]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center text-zinc-300">
        <div className="hud-panel max-w-lg border-[#2a2a2a] p-6">
          <div className="mb-3 flex items-center justify-center gap-2 text-[#f97316]">
            <Globe className="h-5 w-5" />
            <span className="text-sm font-mono uppercase tracking-[0.18em]">Globe unavailable</span>
          </div>
          <p className="text-sm leading-6 text-zinc-300">
            Add <code className="rounded bg-[#111] px-1.5 py-0.5 text-zinc-100">VITE_MAPBOX_ACCESS_TOKEN</code> to enable the 3D globe view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -122,
          latitude: 35,
          zoom: 1.55,
          pitch: projection === "globe" ? 42 : 0,
          bearing: 0,
        }}
        projection={projection}
        mapStyle={
          style === "satellite"
            ? "mapbox://styles/mapbox/satellite-streets-v12"
            : "mapbox://styles/mapbox/dark-v11"
        }
        dragRotate={true}
        touchZoomRotate={true}
        touchPitch={true}
        maxPitch={70}
        minZoom={1.2}
        reuseMaps={true}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        onLoad={() => setIsMapReady(true)}
        onClick={() => setPopup(null)}
      >
        <NavigationControl position="top-right" visualizePitch={true} showCompass={true} />

        {incidents.map((incident) => {
          const isSelected = incident.id === selectedIncidentId;
          const color = getIncidentColor(incident);

          return (
            <Marker
              key={incident.id}
              longitude={incident.estimatedLng}
              latitude={incident.estimatedLat}
              anchor="center"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectIncident(incident.id);
                  setPopup({ type: "incident", incident });
                }}
                className="group relative flex min-h-11 min-w-11 items-center justify-center"
                aria-label={`Open incident ${incident.id}`}
              >
                <span
                  className={`absolute rounded-full ${isSelected ? "h-10 w-10" : "h-7 w-7"}`}
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 18px ${color}`,
                    opacity: isSelected ? 0.4 : 0.22,
                  }}
                />
                <span
                  className={`relative rounded-full border-2 border-white ${isSelected ? "h-4 w-4" : "h-3 w-3"}`}
                  style={{ backgroundColor: color }}
                />
              </button>
            </Marker>
          );
        })}

        {receivers.map((receiver) => (
          <Marker
            key={receiver.id}
            longitude={receiver.lng}
            latitude={receiver.lat}
            anchor="center"
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPopup({ type: "receiver", receiver });
              }}
              className="flex min-h-11 min-w-11 items-center justify-center"
              aria-label={`Open receiver ${receiver.stationCode}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm border border-white"
                style={{
                  backgroundColor: getReceiverColor(receiver),
                  boxShadow: `0 0 10px ${getReceiverColor(receiver)}`,
                }}
              />
            </button>
          </Marker>
        ))}

        {popup?.type === "incident" && (
          <Popup
            longitude={popup.incident.estimatedLng}
            latitude={popup.incident.estimatedLat}
            onClose={() => setPopup(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            offset={16}
            className="hud-popup"
            maxWidth="300px"
          >
            <div className="min-w-[220px] border border-[#2a2a2a] bg-[#0a0a0a] font-mono text-zinc-100">
              <div className="border-b border-[#2a2a2a] bg-[#111] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f97316]">
                Incident {popup.incident.id}
              </div>
              <div className="space-y-2 px-3 py-3 text-[11px] uppercase tracking-[0.14em]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Status</span>
                  <span>{popup.incident.status}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Severity</span>
                  <span>{popup.incident.severity}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Confidence</span>
                  <span>{Math.round(popup.incident.confidenceScore * 100)}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Beacon</span>
                  <span className="truncate text-right">{popup.incident.beaconId}</span>
                </div>
              </div>
            </div>
          </Popup>
        )}

        {popup?.type === "receiver" && (
          <Popup
            longitude={popup.receiver.lng}
            latitude={popup.receiver.lat}
            onClose={() => setPopup(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            offset={14}
            className="hud-popup"
            maxWidth="280px"
          >
            <div className="min-w-[220px] border border-[#2a2a2a] bg-[#0a0a0a] font-mono text-zinc-100">
              <div className="border-b border-[#2a2a2a] bg-[#111] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#38bdf8]">
                Receiver {popup.receiver.stationCode}
              </div>
              <div className="space-y-2 px-3 py-3 text-[11px] uppercase tracking-[0.14em]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Station</span>
                  <span className="truncate text-right">{popup.receiver.stationName}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Status</span>
                  <span>{popup.receiver.status}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#666]">Region</span>
                  <span>{popup.receiver.region}</span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute left-3 top-3 z-[1001] flex max-w-[calc(100%-6rem)] flex-col gap-2 sm:left-4 sm:top-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-black/80 px-3 py-2 backdrop-blur-sm">
          <Globe className="h-4 w-4 text-[#f97316]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-100">
            {projection === "globe" ? "3D globe" : "2D globe map"}
          </span>
        </div>
        {isCompactViewport && (
          <div className="pointer-events-auto rounded-full border border-[#2a2a2a] bg-black/80 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-sm">
            Mobile safe mode
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1001] w-[min(calc(100%-1rem),26rem)] -translate-x-1/2 sm:bottom-6">
        <div className="pointer-events-auto grid grid-cols-3 gap-2 rounded-2xl border border-[#2a2a2a] bg-black/80 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              if (isCompactViewport) {
                return;
              }

              setProjection((current) => (current === "globe" ? "mercator" : "globe"));
            }}
            disabled={isCompactViewport}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-[#1f1f1f] bg-[#111] px-3 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-100 transition-colors hover:border-[#f97316] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#1f1f1f]"
          >
            <Compass className="h-4 w-4" />
            {isCompactViewport ? "Mobile" : projection === "globe" ? "3D" : "2D"}
          </button>
          <button
            type="button"
            onClick={() => setShowStyleMenu((current) => !current)}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-[#1f1f1f] bg-[#111] px-3 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-100 transition-colors hover:border-[#f97316]"
          >
            <Layers className="h-4 w-4" />
            {style}
          </button>
          <button
            type="button"
            onClick={() => {
              mapRef.current?.flyTo({
                center: [-122, 35],
                zoom: 1.55,
                pitch: projection === "globe" ? 42 : 0,
                bearing: 0,
                duration: 1200,
                essential: true,
              });
            }}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-[#1f1f1f] bg-[#111] px-3 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-100 transition-colors hover:border-[#f97316]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {showStyleMenu && (
          <div className="pointer-events-auto mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-[#2a2a2a] bg-black/85 p-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setStyle("dark");
                setShowStyleMenu(false);
              }}
              className={`touch-target rounded-xl border px-3 text-[10px] font-mono uppercase tracking-[0.16em] transition-colors ${
                style === "dark"
                  ? "border-[#f97316] bg-[#1a120b] text-[#f97316]"
                  : "border-[#1f1f1f] bg-[#111] text-zinc-100 hover:border-[#333]"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => {
                setStyle("satellite");
                setShowStyleMenu(false);
              }}
              className={`touch-target rounded-xl border px-3 text-[10px] font-mono uppercase tracking-[0.16em] transition-colors ${
                style === "satellite"
                  ? "border-[#f97316] bg-[#1a120b] text-[#f97316]"
                  : "border-[#1f1f1f] bg-[#111] text-zinc-100 hover:border-[#333]"
              }`}
            >
              Satellite
            </button>
          </div>
        )}
      </div>

      {selectedIncident && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1001] hidden sm:block">
          <div className="pointer-events-auto rounded-2xl border border-[#2a2a2a] bg-black/80 px-3 py-2 backdrop-blur-sm">
            <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#666]">Selected incident</div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-100">
              <MapPinned className="h-4 w-4 text-[#f97316]" />
              {selectedIncident.id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
