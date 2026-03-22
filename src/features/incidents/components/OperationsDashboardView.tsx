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
    if (incidents.length > 0 && selectedIncidentId && !selectedIncident) {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId, selectedIncident]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden lg:flex-row">
      <ConnectionBanner />

      <div className="relative z-0 min-h-[55vh] flex-1 lg:min-h-0">
        <ToastContainer />

        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] sm:inset-x-4 sm:top-4 lg:inset-x-auto lg:left-6 lg:right-auto lg:top-6 lg:max-w-[calc(100%-3rem)]">
          <div className="pointer-events-auto max-w-3xl rounded-sm bg-black/70 p-3 backdrop-blur-sm sm:p-4 lg:bg-transparent lg:p-0 lg:backdrop-blur-0">
            <h1 className="mb-1 text-xl font-medium tracking-[0.2em] text-zinc-100 uppercase drop-shadow-md sm:text-2xl lg:text-3xl">
              Autonomous Recon Unit
            </h1>
            <div className="mb-3 flex items-center gap-2">
              <span className="hud-text-muted text-[#666]">/MODE SURVEILLANCE</span>
            </div>
            <div className="inline-flex items-center gap-2 border border-[#1f1f1f] bg-[#111] px-2 py-1">
              <span className="block h-1.5 w-1.5 bg-[#22c55e]"></span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#22c55e]">ACTIVE</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:mt-8 lg:flex lg:flex-wrap lg:gap-4">
              <div className="hud-panel flex min-w-0 flex-col p-3">
                <div className="hud-text-muted mb-1">ACTIVE INCIDENTS</div>
                <div className="hud-value text-xl text-[#f97316] sm:text-2xl">
                  {incidents.filter((i) => i.status === INCIDENT_STATUSES.ACTIVE).length}
                </div>
              </div>

              <div className="hud-panel flex min-w-0 flex-col p-3">
                <div className="hud-text-muted mb-1">TEST BEACONS</div>
                <div className="hud-value text-xl text-zinc-300 sm:text-2xl">
                  {incidents.filter((i) => i.severity === INCIDENT_SEVERITIES.LOW).length}
                </div>
              </div>

              <div className="hud-panel flex min-w-0 flex-col p-3 min-[480px]:col-span-2 sm:col-span-1">
                <div className="hud-text-muted mb-1">RECEIVERS ONLINE</div>
                <div className="hud-value text-xl text-[#22c55e] sm:text-2xl">
                  {receivers.filter((r) => r.status === RECEIVER_STATUSES.ONLINE).length}{" "}
                  <span className="text-xs text-[#666] sm:text-sm">/ {receivers.length}</span>
                </div>
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

      <div className="flex max-h-[45vh] w-full shrink-0 flex-col border-t border-[#1f1f1f] bg-[#0a0a0a] lg:max-h-none lg:w-[24rem] lg:border-t-0 lg:border-l xl:w-[26rem]">
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
