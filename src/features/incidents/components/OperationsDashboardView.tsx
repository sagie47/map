import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { MapView } from "../../../components/MapView";
import { IncidentDrawer } from "./IncidentDrawer";
import { EventFeed } from "./EventFeed";
import { INCIDENT_STATUSES, RECEIVER_STATUSES } from "../../../../shared/constants/statuses";
import { useIncidents, useLiveEvents, useVessels, useAlerts, useIncidentEvents } from "../hooks";
import { useReceivers } from "../../receivers/hooks";
import { ConnectionBanner } from "../../connection/components/ConnectionBanner";
import { ToastContainer } from "../../notifications/components/ToastContainer";
import { buildSarIntel } from "../sar";

export function OperationsDashboardView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    searchParams.get("incident"),
  );
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(true);
  const [leftHudCollapsed, setLeftHudCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCollapsedPreview, setShowCollapsedPreview] = useState(false);
  const leftViewportInset = leftHudCollapsed ? 56 : 320;
  const rightViewportInset = sidebarCollapsed ? 56 : 384;

  const { data: incidents = [] } = useIncidents();
  const { data: receivers = [] } = useReceivers();
  const { data: events = [] } = useLiveEvents();
  const allPositions = useVessels();
  const { vessels, aircraft, satellites } = useMemo(() => {
    const grouped = {
      vessels: [] as typeof allPositions,
      aircraft: [] as typeof allPositions,
      satellites: [] as typeof allPositions,
    };
    for (const position of allPositions) {
      if (position.assetType === 'vessel') grouped.vessels.push(position);
      else if (position.assetType === 'aircraft') grouped.aircraft.push(position);
      else if (position.assetType === 'satellite') grouped.satellites.push(position);
    }
    return grouped;
  }, [allPositions]);
  const alerts = useAlerts();
  const { data: selectedIncidentEvents = [] } = useIncidentEvents(selectedIncidentId);

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
  const prioritizedIncident = useMemo(() => {
    if (incidents.length === 0) {
      return null;
    }
    return [...incidents].sort((left, right) => {
      const leftActive = left.status === INCIDENT_STATUSES.ACTIVE ? 1 : 0;
      const rightActive = right.status === INCIDENT_STATUSES.ACTIVE ? 1 : 0;
      if (leftActive !== rightActive) return rightActive - leftActive;
      const severityRank = { high: 3, medium: 2, low: 1 } as const;
      const severityDelta = severityRank[right.severity] - severityRank[left.severity];
      if (severityDelta !== 0) return severityDelta;
      if (right.confidenceScore !== left.confidenceScore) {
        return right.confidenceScore - left.confidenceScore;
      }
      return Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt);
    })[0];
  }, [incidents]);
  const pathHistory = useMemo(
    () =>
      [...selectedIncidentEvents]
        .sort((left, right) => Date.parse(left.detectedAt) - Date.parse(right.detectedAt))
        .map((event) => ({
          lat: event.lat,
          lng: event.lng,
          timestamp: event.detectedAt,
          receiverId: event.receiverStationId,
        })),
    [selectedIncidentEvents],
  );
  const sarIntel = useMemo(
    () =>
      selectedIncident
        ? buildSarIntel({
            incident: selectedIncident,
            events: selectedIncidentEvents,
            vessels,
            aircraft,
            receivers,
            alerts,
          })
        : null,
    [selectedIncident, selectedIncidentEvents, vessels, aircraft, receivers, alerts],
  );

  useEffect(() => {
    // If we have incidents loaded, but the selected one doesn't exist, clear it
    if (incidents.length > 0 && selectedIncidentId && !selectedIncident) {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId, selectedIncident]);

  useEffect(() => {
    if (!autoSelectEnabled || selectedIncidentId || !prioritizedIncident) {
      return;
    }
    setSelectedIncidentId(prioritizedIncident.id);
  }, [autoSelectEnabled, selectedIncidentId, prioritizedIncident]);

  const opsTicker = useMemo(() => {
    const items: string[] = [];

    if (sarIntel?.recommendations[0]) {
      items.push(
        `PRIMARY ASSET ${sarIntel.recommendations[0].asset.name.toUpperCase()} ETA ${Math.round(
          sarIntel.recommendations[0].etaMinutes,
        )} MIN`,
      );
    }
    if (selectedIncident) {
      items.push(
        `${selectedIncident.severity.toUpperCase()} ${selectedIncident.domainType.toUpperCase()} DISTRESS CONFIDENCE ${Math.round(
          selectedIncident.confidenceScore * 100,
        )}%`,
      );
    }
    if (sarIntel) {
      items.push(
        `SEARCH AREA ${Math.round(sarIntel.searchArea.areaKm2)} KM2 WINDOW ${sarIntel.searchArea.searchWindowHours} HR`,
      );
      items.push(
        `COVERAGE ${Math.round(sarIntel.coverage.score)}% ${sarIntel.coverage.label.toUpperCase()}`,
      );
    }
    if (alerts[0]) {
      items.push(`LIVE ALERT ${alerts[0].type.toUpperCase()} ${alerts[0].headline.toUpperCase()}`);
    }
    if (events[0]) {
      items.push(`LATEST HIT ${events[0].incidentId} VIA ${(events[0].stationCode || events[0].receiverStationId).toUpperCase()}`);
    }

    return items.slice(0, 5);
  }, [sarIntel, selectedIncident, alerts, events]);

  const missionCard = useMemo(() => {
    if (!selectedIncident || !sarIntel) {
      return null;
    }
    return {
      status: `${selectedIncident.severity.toUpperCase()} DISTRESS`,
      confidence: `${Math.round(selectedIncident.confidenceScore * 100)}%`,
      lastSignal: `${Math.round(sarIntel.searchArea.ageMinutes)} MIN AGO`,
      nextAction: sarIntel.recommendations[0]
        ? `DISPATCH ${sarIntel.recommendations[0].asset.name.toUpperCase()}`
        : "HOLD SEARCH BOX / VERIFY NEXT HIT",
      primaryEta: sarIntel.recommendations[0]
        ? `${Math.round(sarIntel.recommendations[0].etaMinutes)} MIN`
        : "PENDING",
      searchArea: `${Math.round(sarIntel.searchArea.areaKm2)} KM2`,
      coverage: `${Math.round(sarIntel.coverage.score)}% ${sarIntel.coverage.label.toUpperCase()}`,
    };
  }, [selectedIncident, sarIntel]);

  const collapsedPreviewItems = useMemo(() => {
    const items: { id: string; label: string; tone: string; incidentId: string | null }[] = [];

    for (const incident of incidents.slice(0, 2)) {
      items.push({
        id: `incident-${incident.id}`,
        label: `${incident.severity.toUpperCase()} ${incident.domainType.toUpperCase()} ${incident.id}`,
        tone: incident.severity === "high" ? "text-red-400" : incident.severity === "medium" ? "text-[#f97316]" : "text-yellow-400",
        incidentId: incident.id,
      });
    }

    for (const event of events.slice(0, 2)) {
      items.push({
        id: `event-${event.id}`,
        label: `HIT ${event.incidentId} VIA ${(event.stationCode || event.receiverStationId).toUpperCase()}`,
        tone: "text-zinc-300",
        incidentId: event.incidentId,
      });
    }

    return items.slice(0, 4);
  }, [incidents, events]);

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

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <ConnectionBanner />
      
      <div className="flex-1 relative z-0">
        <ToastContainer />

        {opsTicker.length > 0 && (
          <div
            className="pointer-events-none absolute top-4 z-[1000]"
            style={{
              left: `${leftViewportInset + 16}px`,
              right: `${rightViewportInset + 16}px`,
            }}
          >
            <div className="overflow-hidden rounded-sm border border-[#1f1f1f] bg-[#070707]/88 px-3 py-2 shadow-[0_0_20px_rgba(249,115,22,0.08)] backdrop-blur-sm">
              <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-300">
                {opsTicker.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 && <span className="text-[#444]">///</span>}
                    <span className={index === 0 ? "text-[#f97316]" : ""}>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          className="pointer-events-none absolute bottom-6 z-[1000]"
          style={{ left: "24px", maxWidth: `calc(100vw - ${rightViewportInset + 72}px)` }}
        >
          <div
            className={`pointer-events-auto relative transition-[width] duration-200 ${
              leftHudCollapsed ? "w-14" : "w-[min(52vw,680px)]"
            }`}
            style={{
              maxWidth: leftHudCollapsed ? "56px" : `calc(100vw - ${rightViewportInset + 96}px)`,
            }}
          >
            <button
              type="button"
              onClick={() => setLeftHudCollapsed((value) => !value)}
              className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-[#1f1f1f] bg-[#111] text-zinc-300 transition-colors hover:bg-[#171717] hover:text-white"
              title={leftHudCollapsed ? "Expand left HUD" : "Collapse left HUD"}
            >
              {leftHudCollapsed ? <PanelRightOpen className="h-4 w-4 rotate-180" /> : <PanelRightClose className="h-4 w-4 rotate-180" />}
            </button>

            {leftHudCollapsed ? (
              <div className="flex min-h-[220px] flex-col items-center rounded-sm border border-[#1f1f1f] bg-[#070707]/84 px-2 pt-16 backdrop-blur-sm">
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#22c55e]">HUD</div>
                <div className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                  {incidents.filter(i => i.status === INCIDENT_STATUSES.ACTIVE).length}
                </div>
                <div className="mt-2 text-[9px] font-mono uppercase tracking-[0.18em] text-[#666]">
                  Active
                </div>
              </div>
            ) : (
              <div className="flex max-w-[min(52vw,680px)] flex-col gap-3">
                <div className="rounded-sm border border-[#1f1f1f] bg-[#070707]/84 px-3 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3 pl-12">
                    <h1 className="text-lg font-sans font-medium text-zinc-100 tracking-[0.18em] uppercase drop-shadow-md">
                      Autonomous Recon Unit
                    </h1>
                    <button
                      onClick={async () => {
                        try {
                          await fetch('/api/demo/incident', { method: 'POST' });
                        } catch (e) {
                          console.error('Failed to generate demo incident:', e);
                        }
                      }}
                      className="border border-[#333] bg-[#111] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#f97316] transition-colors hover:border-[#f97316]"
                    >
                      + DEMO INCIDENT
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 pl-12">
                    <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#666]">/MODE SURVEILLANCE</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 border border-[#1f1f1f] bg-[#111] px-2 py-1 ml-12">
                    <span className="w-1.5 h-1.5 bg-[#22c55e] block"></span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#22c55e]">ACTIVE</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-sm border border-[#1f1f1f] bg-[#070707]/84 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#666]">ACTIVE INCIDENTS</div>
                    <div className="mt-1 text-xl font-mono text-[#f97316]">
                      {incidents.filter(i => i.status === INCIDENT_STATUSES.ACTIVE).length}
                    </div>
                  </div>
                  
                  <div className="rounded-sm border border-[#1f1f1f] bg-[#070707]/84 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#666]">LIVE VESSELS</div>
                    <div className="mt-1 text-xl font-mono text-purple-500">
                      {vessels.length}
                    </div>
                  </div>
                  
                  <div className="rounded-sm border border-[#1f1f1f] bg-[#070707]/84 px-3 py-2 backdrop-blur-sm">
                    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#666]">RECEIVERS ONLINE</div>
                    <div className="mt-1 text-xl font-mono text-[#22c55e]">
                      {receivers.filter(r => r.status === RECEIVER_STATUSES.ONLINE).length} <span className="text-xs text-[#666]">/ {receivers.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {missionCard && (
          <div
            className="pointer-events-none absolute bottom-6 z-[1000]"
            style={{
              right: `${rightViewportInset + 24}px`,
              maxWidth: `min(320px, calc(100vw - ${leftViewportInset + rightViewportInset + 96}px))`,
            }}
          >
            <div className="max-w-full rounded-sm border border-[#2a2a2a] bg-[#050505]/84 shadow-[0_0_28px_rgba(249,115,22,0.1)] backdrop-blur-sm">
              <div className="border-b border-[#2a2a2a] bg-gradient-to-r from-[#2a1208] to-[#090909] px-3 py-2">
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#f97316]">
                  Mission Brief
                </div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-mono uppercase tracking-[0.12em] text-zinc-100">
                      {missionCard.status}
                    </div>
                    <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.16em] text-zinc-400">
                      NEXT ACTION // {missionCard.nextAction}
                    </div>
                  </div>
                  <div className="rounded-full border border-[#f97316]/40 bg-[#120b07] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#f97316]">
                    {missionCard.primaryEta}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[#1a1a1a]">
                <div className="bg-[#080808] px-3 py-2">
                  <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#666]">Confidence</div>
                  <div className="mt-1 text-sm font-mono text-zinc-100">{missionCard.confidence}</div>
                </div>
                <div className="bg-[#080808] px-3 py-2">
                  <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#666]">Last Signal</div>
                  <div className="mt-1 text-sm font-mono text-zinc-100">{missionCard.lastSignal}</div>
                </div>
                <div className="bg-[#080808] px-3 py-2">
                  <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#666]">Search Box</div>
                  <div className="mt-1 text-sm font-mono text-zinc-100">{missionCard.searchArea}</div>
                </div>
                <div className="bg-[#080808] px-3 py-2">
                  <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#666]">Coverage</div>
                  <div className="mt-1 text-sm font-mono text-zinc-100">{missionCard.coverage}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <MapView
          incidents={incidents}
          receivers={receivers}
          vessels={vessels}
          aircraft={aircraft}
          satellites={satellites}
          alerts={alerts}
          pathHistory={pathHistory}
          probableSearchArea={sarIntel?.searchArea.polygon ?? null}
          interceptRoutes={sarIntel?.interceptGeoJson ?? null}
          primaryAssetId={sarIntel?.recommendations[0]?.asset.id ?? null}
          leftPanelOffsetPx={leftViewportInset}
          rightPanelOffsetPx={rightViewportInset}
          searchAreaLabel={
            sarIntel
              ? `PROBABLE SEARCH AREA // ${Math.round(sarIntel.searchArea.areaKm2)} KM2 // ${sarIntel.searchArea.searchWindowHours} HR WINDOW`
              : null
          }
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={(id) => {
            setAutoSelectEnabled(false);
            setSelectedIncidentId(id);
          }}
        />
      </div>

      {/* Right Sidebar - Event Feed & Drawer */}
      <div
        className={`relative z-10 border-l border-[#1f1f1f] bg-[#0a0a0a] transition-[width] duration-200 ${
          sidebarCollapsed ? "w-14" : "w-80 md:w-96"
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
              <div className="absolute h-4 w-4 rounded-full border border-[#22c55e]/50 animate-ping" />
            </div>
            <div className="writing-mode-vertical rotate-180 text-[10px] font-mono uppercase tracking-[0.25em] text-[#666] [writing-mode:vertical-rl]">
              Live Ops
            </div>
            <div className="mt-6 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              {incidents.length} Inc
            </div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              {events.length} Feed
            </div>
            <div className="mt-3 text-[9px] font-mono uppercase tracking-[0.2em] text-[#666]">
              Ctrl/Cmd+B
            </div>

            {showCollapsedPreview && (
              <div className="absolute right-16 top-16 z-30 w-72 border border-[#1f1f1f] bg-[#070707]/98 p-3 shadow-[0_0_30px_rgba(0,0,0,0.45)]">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#22c55e]">
                  Live Preview
                </div>
                <div className="mt-3 space-y-2">
                  {collapsedPreviewItems.length > 0 ? (
                    collapsedPreviewItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!item.incidentId}
                        onClick={() => {
                          if (!item.incidentId) {
                            return;
                          }
                          setAutoSelectEnabled(false);
                          setSelectedIncidentId(item.incidentId);
                          setSidebarCollapsed(false);
                          setShowCollapsedPreview(false);
                        }}
                        className="w-full border border-[#1a1a1a] bg-[#0b0b0b] px-2 py-2 text-left transition-colors hover:border-[#333] hover:bg-[#101010] disabled:cursor-default disabled:hover:border-[#1a1a1a] disabled:hover:bg-[#0b0b0b]"
                      >
                        <div className={`text-[10px] font-mono uppercase tracking-[0.16em] ${item.tone}`}>
                          {item.label}
                        </div>
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
        ) : (
          <div className="flex h-full flex-col pt-14">
            <div className={selectedIncident ? "h-[42%] min-h-[280px] border-b border-[#1f1f1f]" : "flex-1"}>
              <EventFeed
                events={events}
                incidents={incidents}
                alerts={alerts}
                onSelectIncident={(id) => {
                  setAutoSelectEnabled(false);
                  setSelectedIncidentId(id);
                }}
              />
            </div>
            {selectedIncident && (
              <div className="flex-1 min-h-0">
                <IncidentDrawer
                  incident={selectedIncident}
                  events={selectedIncidentEvents}
                  sarIntel={sarIntel}
                  onClose={() => {
                    setAutoSelectEnabled(false);
                    setSelectedIncidentId(null);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
