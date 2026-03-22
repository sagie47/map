import React, { useEffect } from "react";
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
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] right-3 sm:right-auto sm:bottom-4 sm:left-4">
        <div className="hud-panel pointer-events-auto max-w-xs p-3 sm:max-w-none">
          <h4 className="mb-2 text-[10px] font-mono uppercase tracking-widest text-[#666]">/MAP_LEGEND</h4>
          <div className="grid grid-cols-1 gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 sm:space-y-0">
            <div className="flex items-center"><div className="mr-2 h-2 w-2 shrink-0 border border-white bg-[#ef4444] shadow-[0_0_8px_#ef4444]"></div> ACTIVE INCIDENT</div>
            <div className="flex items-center"><div className="mr-2 h-2 w-2 shrink-0 border border-white bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></div> RESOLVED</div>
            <div className="flex items-center"><div className="mr-2 h-2 w-2 shrink-0 border border-white bg-[#f97316] shadow-[0_0_8px_#f97316]"></div> TEST BEACON</div>
            <div className="flex items-center"><div className="mr-2 h-2 w-2 shrink-0 border border-white bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]"></div> RECEIVER STATION</div>
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
            <div className="bg-black p-2 font-mono text-zinc-100 border border-[#1f1f1f]">
              <h3 className="text-[11px] uppercase tracking-widest break-words">{receiver.stationName}</h3>
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
