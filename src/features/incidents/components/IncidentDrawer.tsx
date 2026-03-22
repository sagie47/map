import React from "react";
import { useNavigate } from "react-router";
import {
  X,
  MapPin,
  Radio,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Play,
  ChevronUp,
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
    <div className="flex flex-col h-full w-full md:h-full md:w-full bg-[#0a0a0a] md:relative fixed inset-x-0 bottom-0 md:bottom-auto max-h-[70vh] md:max-h-none rounded-t-xl md:rounded-none border-t md:border-t-0 border-[#1f1f1f] z-30 md:z-auto">
      {/* Mobile Drag Handle */}
      <div className="flex items-center justify-center py-2 md:hidden">
        <div className="w-10 h-1 bg-[#333] rounded-full"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f] md:border-b">
        <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 truncate pr-4">
          INCIDENT // {incident.id}
        </h2>
        <button
          onClick={onClose}
          className="p-2 md:p-1 text-[#666] hover:text-zinc-100 hover:bg-[#111] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-auto md:min-h-auto"
          aria-label="Close incident panel"
        >
          <X className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 px-4 md:px-0">
          <span
            className={`px-2 py-1 md:py-0.5 text-[10px] font-mono uppercase tracking-widest border ${
              incident.status === INCIDENT_STATUSES.ACTIVE
                ? "bg-[#111] text-[#22c55e] border-[#1f1f1f]"
                : "bg-black text-[#666] border-[#1f1f1f]"
            }`}
          >
            {incident.status}
          </span>
          <span
            className={`px-2 py-1 md:py-0.5 text-[10px] font-mono uppercase tracking-widest border ${
              incident.severity === INCIDENT_SEVERITIES.LOW
                ? "bg-[#111] text-yellow-500 border-[#1f1f1f]"
                : incident.severity === INCIDENT_SEVERITIES.MEDIUM
                ? "bg-[#111] text-[#f97316] border-[#1f1f1f]"
                : "bg-[#111] text-red-500 border-[#1f1f1f]"
            }`}
          >
            {incident.severity}
          </span>
          <span className="px-2 py-1 md:py-0.5 text-[10px] font-mono uppercase tracking-widest border border-[#1f1f1f] bg-black text-zinc-300">
            {incident.domainType}
          </span>
        </div>

        {/* Core Details */}
        <div className="space-y-4 px-4 md:px-0">
          <DetailRow
            icon={<Radio className="w-4 h-4" />}
            label="Beacon ID"
            value={incident.beaconId}
          />
          <DetailRow
            icon={<Activity className="w-4 h-4" />}
            label="Protocol"
            value={incident.protocol || "Unknown"}
          />
          <DetailRow
            icon={<MapPin className="w-4 h-4" />}
            label="Location"
            value={`${incident.estimatedLat.toFixed(4)}, ${incident.estimatedLng.toFixed(4)}`}
          />
          <DetailRow
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Confidence"
            value={`${(incident.confidenceScore * 100).toFixed(1)}%`}
          />
          <DetailRow
            icon={<Clock className="w-4 h-4" />}
            label="First Seen"
            value={format(new Date(incident.firstSeenAt), "MMM d, HH:mm:ss")}
          />
          <DetailRow
            icon={<Clock className="w-4 h-4" />}
            label="Last Seen"
            value={formatDistanceToNow(new Date(incident.lastSeenAt), {
              addSuffix: true,
            })}
          />

          <button
            onClick={() => navigate(`/replay/${incident.id}`)}
            className="w-full mt-4 flex items-center justify-center py-3 px-4 md:py-2 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[11px] font-mono uppercase tracking-widest text-zinc-200 transition-colors min-h-[44px]"
          >
            <Play className="w-3 h-3 mr-2" />
            REPLAY TIMELINE
          </button>
        </div>

        {/* Detection History */}
        <div className="px-4 md:px-0">
          <h3 className="hud-text-muted mb-3">
            DETECTION HISTORY
          </h3>
          {loading ? (
            <div className="text-[10px] font-mono text-[#666] animate-pulse">
              /LOADING_EVENTS...
            </div>
          ) : events.length === 0 ? (
            <div className="text-[10px] font-mono text-[#666]">/NO_EVENTS_FOUND</div>
          ) : (
            <div className="space-y-3">
              {events.map((event, idx) => (
                <div
                  key={event.id}
                  className="relative pl-4 border-l border-[#1f1f1f] pb-4 last:pb-0"
                >
                  <div className="absolute w-1.5 h-1.5 bg-[#f97316] -left-[3px] top-1.5"></div>
                  <div className="text-[10px] font-mono text-[#666] mb-1">
                    {format(new Date(event.detectedAt), "HH:mm:ss")}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300">
                    DETECTED BY{" "}
                    <span className="text-[#22c55e]">
                      {event.stationName || event.receiverStationId}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#666] mt-1">
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
    <div className="flex items-center justify-between text-[11px] font-mono uppercase">
      <div className="flex items-center text-[#666]">
        {icon}
        <span className="ml-2 tracking-widest">{label}</span>
      </div>
      <div className="text-zinc-100">{value}</div>
    </div>
  );
}
