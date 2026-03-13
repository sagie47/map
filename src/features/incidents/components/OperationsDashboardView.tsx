import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { MapView } from "../../../components/MapView";
import { IncidentDrawer } from "./IncidentDrawer";
import { EventFeed } from "./EventFeed";
import { INCIDENT_STATUSES, RECEIVER_STATUSES, INCIDENT_SEVERITIES } from "../../../../shared/constants/statuses";
import { useIncidents, useLiveEvents } from "../hooks";
import { useReceivers } from "../../receivers/hooks";
import { ConnectionBanner } from "../../connection/components/ConnectionBanner";
import { ToastContainer } from "../../notifications/components/ToastContainer";
import { useSocketConnection } from "../../connection/hooks";

export function OperationsDashboardView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    searchParams.get("incident"),
  );

  useSocketConnection();

  const { data: incidents = [] } = useIncidents();
  const { data: receivers = [] } = useReceivers();
  const { data: events = [] } = useLiveEvents();

  useEffect(() => {
    if (searchParams.get("incident") !== selectedIncidentId) {
      if (selectedIncidentId) {
        setSearchParams({ incident: selectedIncidentId });
      } else {
        setSearchParams({});
      }
    }
  }, [selectedIncidentId, setSearchParams]);

  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) || null;

  useEffect(() => {
    // If we have incidents loaded, but the selected one doesn't exist, clear it
    if (incidents.length > 0 && selectedIncidentId && !selectedIncident) {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId, selectedIncident]);

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <ConnectionBanner />
      
      <div className="flex-1 relative z-0">
        <ToastContainer />

        <div className="absolute top-6 left-6 z-[1000] flex flex-col pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-3xl font-sans font-medium text-zinc-100 tracking-widest uppercase mb-1 drop-shadow-md">
              Autonomous Recon Unit
            </h1>
            <div className="flex items-center gap-2 mb-3">
              <span className="hud-text-muted text-[#666]">/MODE SURVEILLANCE</span>
            </div>
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-[#111] border border-[#1f1f1f]">
              <span className="w-1.5 h-1.5 bg-[#22c55e] block"></span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#22c55e]">ACTIVE</span>
            </div>
          </div>
          
          <div className="mt-8 flex gap-4 pointer-events-auto">
            <div className="hud-panel p-3 flex flex-col min-w-[120px]">
              <div className="hud-text-muted mb-1">ACTIVE INCIDENTS</div>
              <div className="hud-value text-2xl text-[#f97316]">
                {incidents.filter(i => i.status === INCIDENT_STATUSES.ACTIVE).length}
              </div>
            </div>
            
            <div className="hud-panel p-3 flex flex-col min-w-[120px]">
              <div className="hud-text-muted mb-1">TEST BEACONS</div>
              <div className="hud-value text-2xl text-zinc-300">
                {incidents.filter(i => i.severity === INCIDENT_SEVERITIES.LOW).length}
              </div>
            </div>
            
            <div className="hud-panel p-3 flex flex-col min-w-[120px]">
              <div className="hud-text-muted mb-1">RECEIVERS ONLINE</div>
              <div className="hud-value text-2xl text-[#22c55e]">
                {receivers.filter(r => r.status === RECEIVER_STATUSES.ONLINE).length} <span className="text-sm text-[#666]">/ {receivers.length}</span>
              </div>
            </div>
          </div>
        </div>

        <MapView
          incidents={incidents}
          receivers={receivers}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={setSelectedIncidentId}
        />
      </div>

      {/* Right Sidebar - Event Feed & Drawer */}
      <div className="w-80 md:w-96 bg-[#0a0a0a] border-l border-[#1f1f1f] flex flex-col z-10">
        {selectedIncident ? (
          <IncidentDrawer
            incident={selectedIncident}
            onClose={() => setSelectedIncidentId(null)}
          />
        ) : (
          <EventFeed events={events} onSelectIncident={setSelectedIncidentId} />
        )}
      </div>
    </div>
  );
}
