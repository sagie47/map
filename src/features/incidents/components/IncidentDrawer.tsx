import React from "react";
import { useNavigate } from "react-router";
import {
  X,
  MapPin,
  Radio,
  AlertTriangle,
  Clock,
  Activity,
  Play,
} from "lucide-react";
import { Incident } from "@shared/types/incidents";
import { formatDistanceToNow, format } from "date-fns";

import { INCIDENT_STATUSES, INCIDENT_SEVERITIES } from "@shared/constants/statuses";
import { useIncidentEvents } from "../hooks";

export function IncidentDrawer({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) {
  const { data: events = [], isLoading: loading } = useIncidentEvents(incident.id);
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-4 md:px-4 md:py-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[#666] md:hidden">
            Incident details
          </p>
          <h2 className="truncate pr-4 text-base font-mono uppercase tracking-[0.15em] text-zinc-100 md:text-sm">
            INCIDENT // {incident.id}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close incident details"
          className="touch-target-icon rounded-sm text-[#666] transition-colors hover:bg-[#111] hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 pb-6 md:space-y-6">
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-2 py-1 text-[11px] font-mono uppercase tracking-widest border md:py-0.5 md:text-[10px] ${
              incident.status === INCIDENT_STATUSES.ACTIVE
                ? "bg-[#111] text-[#22c55e] border-[#1f1f1f]"
                : "bg-black text-[#666] border-[#1f1f1f]"
            }`}
          >
            {incident.status}
          </span>
          <span
            className={`px-2 py-1 text-[11px] font-mono uppercase tracking-widest border md:py-0.5 md:text-[10px] ${
              incident.severity === INCIDENT_SEVERITIES.LOW
                ? "bg-[#111] text-yellow-500 border-[#1f1f1f]"
                : incident.severity === INCIDENT_SEVERITIES.MEDIUM
                  ? "bg-[#111] text-[#f97316] border-[#1f1f1f]"
                  : "bg-[#111] text-red-500 border-[#1f1f1f]"
            }`}
          >
            {incident.severity}
          </span>
          <span className="border border-[#1f1f1f] bg-black px-2 py-1 text-[11px] font-mono uppercase tracking-widest text-zinc-300 md:py-0.5 md:text-[10px]">
            {incident.domainType}
          </span>
        </div>

        <div className="space-y-4">
          <DetailRow icon={<Radio className="h-4 w-4" />} label="Beacon ID" value={incident.beaconId} />
          <DetailRow icon={<Activity className="h-4 w-4" />} label="Protocol" value={incident.protocol || "Unknown"} />
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            value={`${incident.estimatedLat.toFixed(4)}, ${incident.estimatedLng.toFixed(4)}`}
          />
          <DetailRow
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Confidence"
            value={`${(incident.confidenceScore * 100).toFixed(1)}%`}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="First Seen"
            value={format(new Date(incident.firstSeenAt), "MMM d, HH:mm:ss")}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="Last Seen"
            value={formatDistanceToNow(new Date(incident.lastSeenAt), {
              addSuffix: true,
            })}
          />

          <button
            onClick={() => navigate(`/replay/${incident.id}`)}
            className="touch-target mt-4 flex w-full items-center justify-center border border-[#1f1f1f] bg-[#111] px-4 py-3 text-xs font-mono uppercase tracking-widest text-zinc-200 transition-colors hover:bg-[#1a1a1a] md:py-2 md:text-[11px]"
          >
            <Play className="mr-2 h-3.5 w-3.5" />
            REPLAY TIMELINE
          </button>
        </div>

        <div>
          <h3 className="mb-3 text-[11px] font-mono uppercase tracking-[0.18em] text-[#666] md:text-[10px]">
            DETECTION HISTORY
          </h3>
          {loading ? (
            <div className="animate-pulse text-xs font-mono text-[#666] md:text-[10px]">
              /LOADING_EVENTS...
            </div>
          ) : events.length === 0 ? (
            <div className="text-xs font-mono text-[#666] md:text-[10px]">/NO_EVENTS_FOUND</div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="relative border-l border-[#1f1f1f] pb-4 pl-4 last:pb-0"
                >
                  <div className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 bg-[#f97316]"></div>
                  <div className="mb-1 text-[11px] font-mono text-[#666] md:text-[10px]">
                    {format(new Date(event.detectedAt), "HH:mm:ss")}
                  </div>
                  <div className="text-sm font-mono text-zinc-300 md:text-[11px]">
                    DETECTED BY{" "}
                    <span className="text-[#22c55e]">
                      {event.stationName || event.receiverStationId}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[#666] md:text-[10px]">
                    SIG_STRENGTH: {event.signalStrength.toFixed(1)} dB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#111] pb-3 text-sm font-mono uppercase md:flex-row md:items-center md:justify-between md:gap-3 md:border-b-0 md:pb-0 md:text-[11px]">
      <div className="flex items-center text-[#666]">
        {icon}
        <span className="ml-2 tracking-widest">{label}</span>
      </div>
      <div className="break-all text-zinc-100 md:text-right">{value}</div>
    </div>
  );
}
