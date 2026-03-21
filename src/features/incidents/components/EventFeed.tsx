import { SignalEvent } from "@shared/types/events";
import { Incident } from "@shared/types/incidents";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertTriangle, Radio, Siren } from "lucide-react";

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

type FeedItem =
  | {
      id: string;
      kind: "signal";
      timestamp: string;
      incidentId: string;
      label: string;
      sublabel: string;
      accent: string;
    }
  | {
      id: string;
      kind: "incident";
      timestamp: string;
      incidentId: string;
      label: string;
      sublabel: string;
      accent: string;
    }
  | {
      id: string;
      kind: "alert";
      timestamp: string;
      incidentId: null;
      label: string;
      sublabel: string;
      accent: string;
    };

export function EventFeed({
  events,
  incidents,
  alerts,
  onSelectIncident,
}: {
  events: SignalEvent[];
  incidents: Incident[];
  alerts: AlertData[];
  onSelectIncident: (id: string) => void;
}) {
  const items: FeedItem[] = [
    ...events.map((event) => ({
      id: event.id,
      kind: "signal" as const,
      timestamp: event.detectedAt,
      incidentId: event.incidentId,
      label: `[${event.eventType}] ${event.incidentId}`,
      sublabel: event.stationCode || event.receiverStationId,
      accent: "#f97316",
    })),
    ...incidents.map((incident) => ({
      id: `incident-${incident.id}`,
      kind: "incident" as const,
      timestamp: incident.lastSeenAt,
      incidentId: incident.id,
      label: `${incident.severity.toUpperCase()} ${incident.domainType.toUpperCase()} INCIDENT`,
      sublabel: incident.beaconId,
      accent: incident.severity === "high" ? "#ef4444" : incident.severity === "medium" ? "#f59e0b" : "#22c55e",
    })),
    ...alerts.map((alert) => ({
      id: `alert-${alert.alertId}`,
      kind: "alert" as const,
      timestamp: alert.timestamp,
      incidentId: null,
      label: `${alert.type.toUpperCase()} ALERT`,
      sublabel: alert.headline,
      accent: alert.severity === "critical" || alert.severity === "Extreme" ? "#ef4444" : "#f59e0b",
    })),
  ]
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 60);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 flex items-center">
          <Activity className="w-4 h-4 mr-2 text-[#f97316]" />
          Live Ops Stream
        </h2>
        <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[#111] text-[#22c55e] border border-[#1f1f1f]">
          LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center hud-text-muted py-8">
            /WAITING_FOR_ACTIVITY...
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-3 bg-black border border-[#1f1f1f] transition-colors ${item.incidentId ? "hover:border-[#333] cursor-pointer" : "cursor-default"}`}
              onClick={() => {
                if (item.incidentId) {
                  onSelectIncident(item.incidentId);
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5"
                  style={{ color: item.accent }}
                >
                  {item.kind === "signal" ? <Radio className="w-3 h-3" /> : item.kind === "incident" ? <Siren className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {item.kind.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-[#666]">
                  {formatDistanceToNow(new Date(item.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="text-xs font-mono text-zinc-300 mb-2">
                {item.label}
              </div>

              <div className="flex items-center text-[10px] font-mono text-[#666] uppercase tracking-wider">
                {item.kind === "signal" ? <Radio className="w-3 h-3 mr-1" /> : item.kind === "incident" ? <Siren className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                {item.sublabel}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
