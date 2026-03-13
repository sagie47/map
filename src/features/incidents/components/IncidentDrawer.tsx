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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
        <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 truncate pr-4">
          INCIDENT // {incident.id}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-[#666] hover:text-zinc-100 hover:bg-[#111] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Badges */}
        <div className="flex gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border ${
              incident.status === INCIDENT_STATUSES.ACTIVE
                ? "bg-[#111] text-[#22c55e] border-[#1f1f1f]"
                : "bg-black text-[#666] border-[#1f1f1f]"
            }`}
          >
            {incident.status}
          </span>
          <span
            className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border ${
              incident.severity === INCIDENT_SEVERITIES.LOW
                ? "bg-[#111] text-yellow-500 border-[#1f1f1f]"
                : incident.severity === INCIDENT_SEVERITIES.MEDIUM
                ? "bg-[#111] text-[#f97316] border-[#1f1f1f]"
                : "bg-[#111] text-red-500 border-[#1f1f1f]"
            }`}
          >
            {incident.severity}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border border-[#1f1f1f] bg-black text-zinc-300">
            {incident.domainType}
          </span>
        </div>

        {/* Core Details */}
        <div className="space-y-4">
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
            className="w-full mt-4 flex items-center justify-center py-2 px-4 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[11px] font-mono uppercase tracking-widest text-zinc-200 transition-colors"
          >
            <Play className="w-3 h-3 mr-2" />
            REPLAY TIMELINE
          </button>
        </div>

        {/* Detection History */}
        <div>
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
