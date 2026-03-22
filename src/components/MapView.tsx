import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  LayersControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Incident } from "@shared/types/incidents";
import { ReceiverStation } from "@shared/types/receivers";
import { INCIDENT_STATUSES, RECEIVER_STATUSES, INCIDENT_SEVERITIES } from "@shared/constants/statuses";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-icon",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 1px solid #fff; box-shadow: 0 0 8px ${color};"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const activeIcon = createCustomIcon("#ef4444"); // red-500
const resolvedIcon = createCustomIcon("#22c55e"); // green-500
const testIcon = createCustomIcon("#f97316"); // orange-500
const receiverIcon = createCustomIcon("#3b82f6"); // blue-500

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

function ZoomControls() {
  const map = useMap();

  return (
    <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-11 h-11 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-zinc-300 hover:text-zinc-100 transition-colors"
        aria-label="Zoom in"
      >
        <span className="text-lg font-mono">+</span>
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-11 h-11 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-zinc-300 hover:text-zinc-100 transition-colors"
        aria-label="Zoom out"
        style={{ marginTop: '-1px' }}
      >
        <span className="text-lg font-mono">−</span>
      </button>
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
  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      style={{ height: "100%", width: "100%", backgroundColor: "#000" }}
      zoomControl={false}
    >
      <ZoomControls />

      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="hud-panel p-3 pointer-events-auto">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">/MAP_LEGEND</h4>
          <div className="space-y-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            <div className="flex items-center"><div className="w-2 h-2 bg-[#ef4444] border border-white mr-2 shadow-[0_0_8px_#ef4444]"></div> ACTIVE INCIDENT</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#22c55e] border border-white mr-2 shadow-[0_0_8px_#22c55e]"></div> RESOLVED</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#f97316] border border-white mr-2 shadow-[0_0_8px_#f97316]"></div> TEST BEACON</div>
            <div className="flex items-center"><div className="w-2 h-2 bg-[#3b82f6] border border-white mr-2 shadow-[0_0_8px_#3b82f6]"></div> RECEIVER STATION</div>
          </div>
        </div>
      </div>

      <LayersControl>
        <LayersControl.BaseLayer checked name="Dark Map">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://opentopomap.org/about">OpenTopoMap</a>'
          />
        </LayersControl.BaseLayer>
      </LayersControl>

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
            <div className="p-2 bg-black border border-[#1f1f1f] text-zinc-100 font-mono">
              <h3 className="text-[11px] uppercase tracking-widest">{receiver.stationName}</h3>
              <p className="text-[10px] text-[#666] mt-1">
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
                radius={100000 * (1 - incident.confidenceScore)} // Uncertainty radius
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
