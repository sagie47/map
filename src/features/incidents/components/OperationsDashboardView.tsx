import React, { Suspense, lazy, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Compass, Map as MapIcon, PanelRightClose, PanelRightOpen } from "lucide-react";
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
  const [leftHudCollapsed, setLeftHudCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCollapsedPreview, setShowCollapsedPreview] = useState(false);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const collapsedPreviewItems = [
    ...incidents.slice(0, 2).map((incident) => ({
      id: `incident-${incident.id}`,
      label: `${incident.severity.toUpperCase()} ${incident.domainType.toUpperCase()} ${incident.id}`,
      tone:
        incident.severity === "high"
          ? "text-red-400"
          : incident.severity === "medium"
            ? "text-[#f97316]"
            : "text-yellow-400",
      incidentId: incident.id,
    })),
    ...events.slice(0, 2).map((event) => ({
      id: `event-${event.id}`,
      label: `HIT ${event.incidentId} VIA ${(event.stationCode || event.receiverStationId).toUpperCase()}`,
      tone: "text-zinc-300",
      incidentId: event.incidentId,
    })),
  ].slice(0, 4);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-black">
      <ConnectionBanner />

      <div className="relative z-0 flex-1 overflow-hidden">
        <ToastContainer />

        <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-col md:left-6 md:top-6">
          <div className={`pointer-events-auto relative max-w-full transition-[width] duration-200 ${leftHudCollapsed ? "w-14" : "w-fit"}`}>
            <button
              type="button"
              onClick={() => setLeftHudCollapsed((value) => !value)}
              className="absolute left-3 top-3 z-20 hidden h-9 w-9 items-center justify-center border border-[#1f1f1f] bg-[#111] text-zinc-300 transition-colors hover:bg-[#171717] hover:text-white md:flex"
              title={leftHudCollapsed ? "Expand left HUD" : "Collapse left HUD"}
            >
              {leftHudCollapsed ? <PanelRightOpen className="h-4 w-4 rotate-180" /> : <PanelRightClose className="h-4 w-4 rotate-180" />}
            </button>

            {leftHudCollapsed ? (
              <div className="flex min-h-[132px] flex-col items-center rounded-sm border border-[#1f1f1f] bg-[#070707]/84 px-2 pt-16 backdrop-blur-sm">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300">
                  {incidents.filter((i) => i.status === INCIDENT_STATUSES.ACTIVE).length}
                </div>
                <div className="mt-2 text-[8px] font-mono uppercase tracking-[0.18em] text-[#666]">Active</div>
                <div className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300">{events.length}</div>
                <div className="mt-2 text-[8px] font-mono uppercase tracking-[0.18em] text-[#666]">Feed</div>
              </div>
            ) : (
              <>
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
              </>
            )}
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

      <div
        className={`relative hidden border-l border-[#1f1f1f] bg-[#0a0a0a] transition-[width] duration-200 md:flex ${
          sidebarCollapsed ? "w-14" : "w-96"
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          className="absolute left-1/2 top-4 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center border border-[#1f1f1f] bg-[#111] text-zinc-300 transition-colors hover:bg-[#171717] hover:text-white"
          title={sidebarCollapsed ? "Expand sidebar (Ctrl/Cmd+B)" : "Collapse sidebar (Ctrl/Cmd+B)"}
        >
          {sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>

        {sidebarCollapsed ? (
          <div
            className="flex h-full flex-col items-center pt-16"
            onMouseEnter={() => setShowCollapsedPreview(true)}
            onMouseLeave={() => setShowCollapsedPreview(false)}
          >
            <div className="relative flex items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
              <div className="absolute h-4 w-4 animate-ping rounded-full border border-[#22c55e]/50" />
            </div>
            <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono uppercase tracking-[0.25em] text-[#666]">
              Live Ops
            </div>
            <div className="mt-6 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">{incidents.length} Inc</div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">{events.length} Feed</div>
            <div className="mt-3 text-[9px] font-mono uppercase tracking-[0.2em] text-[#666]">Ctrl/Cmd+B</div>

            {showCollapsedPreview && (
              <div className="absolute right-16 top-16 z-30 w-72 border border-[#1f1f1f] bg-[#070707]/98 p-3 shadow-[0_0_30px_rgba(0,0,0,0.45)]">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#22c55e]">Live Preview</div>
                <div className="mt-3 space-y-2">
                  {collapsedPreviewItems.length > 0 ? (
                    collapsedPreviewItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedIncidentId(item.incidentId);
                          setSidebarCollapsed(false);
                          setShowCollapsedPreview(false);
                        }}
                        className="w-full border border-[#1a1a1a] bg-[#0b0b0b] px-2 py-2 text-left transition-colors hover:border-[#333] hover:bg-[#101010]"
                      >
                        <div className={`text-[10px] font-mono uppercase tracking-[0.16em] ${item.tone}`}>{item.label}</div>
                      </button>
                    ))
                  ) : (
                    <div className="border border-[#1a1a1a] bg-[#0b0b0b] px-2 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[#666]">
                      No active feed items
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : selectedIncident ? (
          <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncidentId(null)} />
        ) : (
          <EventFeed events={events} onSelectIncident={setSelectedIncidentId} />
        )}
      </div>
    </div>
  );
}
