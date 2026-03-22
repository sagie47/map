import React, { Suspense, lazy, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Compass, Map as MapIcon } from "lucide-react";
import { MapView } from "../../../components/MapView";
import { IncidentDrawer } from "./IncidentDrawer";
import { EventFeed } from "./EventFeed";
import { INCIDENT_STATUSES, RECEIVER_STATUSES, INCIDENT_SEVERITIES } from "../../../../shared/constants/statuses";
import { useIncidents, useLiveEvents } from "../hooks";
import { useReceivers } from "../../receivers/hooks";
import { ConnectionBanner } from "../../connection/components/ConnectionBanner";
import { ToastContainer } from "../../notifications/components/ToastContainer";
import { useSocketConnection } from "../../connection/hooks";

const GlobeView = lazy(() =>
  import("../../../components/GlobeView").then((module) => ({
    default: module.GlobeView,
  })),
);

export function OperationsDashboardView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    searchParams.get("incident"),
  );
  const [viewMode, setViewMode] = useState<"map" | "globe">("map");

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

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;

  useEffect(() => {
    if (incidents.length > 0 && selectedIncidentId && !selectedIncident) {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId, selectedIncident]);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-black">
      <ConnectionBanner />

      <div className="relative z-0 flex-1 overflow-hidden">
        <ToastContainer />

        <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-col md:left-6 md:top-6">
          <div className="pointer-events-auto max-w-full">
            <h1 className="mb-1 text-2xl font-medium uppercase tracking-[0.18em] text-zinc-100 drop-shadow-md md:text-3xl">
              Autonomous Recon Unit
            </h1>
            <div className="mb-3 flex items-center gap-2">
              <span className="hud-text-muted text-[#666]">/MODE SURVEILLANCE</span>
            </div>
            <div className="inline-flex items-center gap-2 border border-[#1f1f1f] bg-[#111] px-2 py-1">
              <span className="block h-1.5 w-1.5 bg-[#22c55e]"></span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#22c55e]">
                ACTIVE
              </span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#1f1f1f] bg-[#090909]/90 p-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`touch-target inline-flex items-center gap-2 rounded-full px-3 text-[10px] font-mono uppercase tracking-[0.16em] transition-colors ${
                  viewMode === "map"
                    ? "bg-[#f97316] text-black"
                    : "text-zinc-300 hover:bg-[#111]"
                }`}
              >
                <MapIcon className="h-4 w-4" />
                Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode("globe")}
                className={`touch-target inline-flex items-center gap-2 rounded-full px-3 text-[10px] font-mono uppercase tracking-[0.16em] transition-colors ${
                  viewMode === "globe"
                    ? "bg-[#f97316] text-black"
                    : "text-zinc-300 hover:bg-[#111]"
                }`}
              >
                <Compass className="h-4 w-4" />
                Globe
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 pointer-events-auto md:mt-8 md:flex md:gap-4">
            <div className="hud-panel col-span-1 flex min-w-0 flex-col p-3 md:min-w-[120px]">
              <div className="hud-text-muted mb-1">ACTIVE INCIDENTS</div>
              <div className="hud-value text-xl text-[#f97316] md:text-2xl">
                {incidents.filter((i) => i.status === INCIDENT_STATUSES.ACTIVE).length}
              </div>
            </div>

            <div className="hud-panel col-span-1 flex min-w-0 flex-col p-3 md:min-w-[120px]">
              <div className="hud-text-muted mb-1">TEST BEACONS</div>
              <div className="hud-value text-xl text-zinc-300 md:text-2xl">
                {incidents.filter((i) => i.severity === INCIDENT_SEVERITIES.LOW).length}
              </div>
            </div>

            <div className="hud-panel col-span-2 flex min-w-0 flex-col p-3 md:min-w-[120px]">
              <div className="hud-text-muted mb-1">RECEIVERS ONLINE</div>
              <div className="hud-value text-xl text-[#22c55e] md:text-2xl">
                {receivers.filter((r) => r.status === RECEIVER_STATUSES.ONLINE).length}{" "}
                <span className="text-sm text-[#666]">/ {receivers.length}</span>
              </div>
            </div>
          </div>
        </div>

        {viewMode === "globe" ? (
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-black">
                <div className="hud-panel border-[#2a2a2a] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-300">
                  Loading globe renderer...
                </div>
              </div>
            }
          >
            <GlobeView
              incidents={incidents}
              receivers={receivers}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
            />
          </Suspense>
        ) : (
          <MapView
            incidents={incidents}
            receivers={receivers}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 md:hidden">
          <div className="pointer-events-auto mx-2 rounded-t-2xl border border-b-0 border-[#1f1f1f] bg-[#0a0a0a]/95 shadow-[0_-16px_48px_rgba(0,0,0,0.65)] backdrop-blur-sm">
            <div className="flex justify-center py-2">
              <span className="h-1.5 w-16 rounded-full bg-[#333]" />
            </div>
            <div className="max-h-[min(60vh,32rem)] min-h-[16rem] overflow-hidden rounded-t-2xl">
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
        </div>
      </div>

      <div className="hidden w-80 flex-col border-l border-[#1f1f1f] bg-[#0a0a0a] md:flex md:w-96">
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
