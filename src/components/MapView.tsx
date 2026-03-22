import React, { useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Layers, Minus, Plus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, RECEIVER_STATUSES } from "@shared/constants/statuses";
import { Incident } from "@shared/types/incidents";
import { ReceiverStation } from "@shared/types/receivers";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BASE_LAYERS = {
  dark: {
    name: "Dark Map",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  terrain: {
    name: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://opentopomap.org/about">OpenTopoMap</a>',
  },
} as const;

type BaseLayerKey = keyof typeof BASE_LAYERS;

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-icon",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 1px solid #fff; box-shadow: 0 0 8px ${color};"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const activeIcon = createCustomIcon("#ef4444");
const resolvedIcon = createCustomIcon("#22c55e");
const testIcon = createCustomIcon("#f97316");
const receiverIcon = createCustomIcon("#3b82f6");

function MapUpdater({
  selectedIncidentId,
  incidents,
}: {
  selectedIncidentId: string | null;
  incidents: Incident[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedIncidentId) {
      const incident = incidents.find((i) => i.id === selectedIncidentId);
      if (incident) {
        map.flyTo([incident.estimatedLat, incident.estimatedLng], 6, {
          duration: 1.5,
        });
      }
    }
  }, [selectedIncidentId, incidents, map]);

  return null;
}

function TouchFriendlyMapControls({
  activeBaseLayer,
  onBaseLayerChange,
}: {
  activeBaseLayer: BaseLayerKey;
  onBaseLayerChange: (layer: BaseLayerKey) => void;
}) {
  const map = useMap();
  const [showLayers, setShowLayers] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2 sm:right-4 sm:top-4">
      <div className="hud-panel pointer-events-auto flex flex-col overflow-hidden border border-[#2a2a2a] bg-black/90 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => map.zoomIn()}
          className="flex min-h-11 min-w-11 items-center justify-center border-b border-[#1f1f1f] text-zinc-100 transition-colors hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => map.zoomOut()}
          className="flex min-h-11 min-w-11 items-center justify-center text-zinc-100 transition-colors hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        >
          <Minus className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-auto flex max-w-full flex-col items-end gap-2">
        <button
          type="button"
          aria-label="Toggle base map options"
          aria-expanded={showLayers}
          onClick={() => setShowLayers((current) => !current)}
          className="hud-panel flex min-h-11 min-w-11 items-center justify-center border border-[#2a2a2a] bg-black/90 text-zinc-100 backdrop-blur-sm transition-colors hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        >
          <Layers className="h-5 w-5" />
        </button>

        {showLayers && (
          <div className="hud-panel flex w-[min(12rem,calc(100vw-1.5rem))] flex-col gap-2 border border-[#2a2a2a] bg-black/95 p-2 backdrop-blur-sm sm:w-48">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
              /BASE_LAYER
            </div>
            {Object.entries(BASE_LAYERS).map(([key, layer]) => {
              const isActive = key === activeBaseLayer;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onBaseLayerChange(key as BaseLayerKey);
                    setShowLayers(false);
                  }}
                  className={`flex min-h-11 items-center justify-between gap-3 border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-[#f97316] ${
                    isActive
                      ? "border-[#f97316] bg-[#1a120b] text-[#f97316]"
                      : "border-[#1f1f1f] bg-[#0f0f0f] text-zinc-300 hover:border-[#333] hover:bg-[#161616]"
                  }`}
                >
                  <span>{layer.name}</span>
                  <span
                    className={`h-2.5 w-2.5 border ${
                      isActive ? "border-[#f97316] bg-[#f97316]" : "border-[#666]"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function MapView({
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
  const [activeBaseLayer, setActiveBaseLayer] = useState<BaseLayerKey>("dark");

  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      style={{ height: "100%", width: "100%", backgroundColor: "#000" }}
      zoomControl={false}
      touchZoom={true}
      doubleClickZoom={true}
      scrollWheelZoom={true}
      dragging={true}
      tap={true}
    >
      <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-none sm:bottom-4 sm:left-4 sm:right-auto">
        <div className="hud-panel pointer-events-auto w-full max-w-sm border border-[#2a2a2a] bg-black/85 p-3 backdrop-blur-sm sm:w-auto">
          <h4 className="mb-2 text-[10px] font-mono uppercase tracking-widest text-[#666]">/MAP_LEGEND</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 sm:flex sm:flex-col sm:space-y-2 sm:gap-0">
            <div className="flex items-center">
              <div className="mr-2 h-2.5 w-2.5 border border-white bg-[#ef4444] shadow-[0_0_8px_#ef4444]" />
              ACTIVE INCIDENT
            </div>
            <div className="flex items-center">
              <div className="mr-2 h-2.5 w-2.5 border border-white bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              RESOLVED
            </div>
            <div className="flex items-center">
              <div className="mr-2 h-2.5 w-2.5 border border-white bg-[#f97316] shadow-[0_0_8px_#f97316]" />
              TEST BEACON
            </div>
            <div className="flex items-center">
              <div className="mr-2 h-2.5 w-2.5 border border-white bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
              RECEIVER STATION
            </div>
          </div>
        </div>
      </div>

      <TouchFriendlyMapControls
        activeBaseLayer={activeBaseLayer}
        onBaseLayerChange={setActiveBaseLayer}
      />

      <TileLayer
        url={BASE_LAYERS[activeBaseLayer].url}
        attribution={BASE_LAYERS[activeBaseLayer].attribution}
      />

      <MapUpdater
        selectedIncidentId={selectedIncidentId}
        incidents={incidents}
      />

      {receivers.map((receiver) => (
        <Marker
          key={receiver.id}
          position={[receiver.lat, receiver.lng]}
          icon={receiverIcon}
        >
          <Popup className="hud-popup">
            <div className="border border-[#1f1f1f] bg-black p-2 font-mono text-zinc-100">
              <h3 className="text-[11px] uppercase tracking-widest">{receiver.stationName}</h3>
              <p className="mt-1 text-[10px] text-[#666]">
                CODE: {receiver.stationCode}
              </p>
              <p className="text-[10px] text-[#666]">
                STATUS:{" "}
                <span
                  className={
                    receiver.status === RECEIVER_STATUSES.ONLINE
                      ? "text-[#22c55e]"
                      : "text-red-500"
                  }
                >
                  {receiver.status.toUpperCase()}
                </span>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {incidents.map((incident) => {
        let icon = activeIcon;
        if (incident.status === INCIDENT_STATUSES.RESOLVED) icon = resolvedIcon;
        if (incident.severity === INCIDENT_SEVERITIES.LOW) icon = testIcon;

        const isSelected = incident.id === selectedIncidentId;

        return (
          <React.Fragment key={incident.id}>
            <Marker
              position={[incident.estimatedLat, incident.estimatedLng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectIncident(incident.id),
              }}
            />
            {isSelected && (
              <Circle
                center={[incident.estimatedLat, incident.estimatedLng]}
                radius={100000 * (1 - incident.confidenceScore)}
                pathOptions={{
                  color: "#ef4444",
                  fillColor: "#ef4444",
                  fillOpacity: 0.2,
                  weight: 1,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
