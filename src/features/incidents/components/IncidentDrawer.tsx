import React, { useState } from "react";
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
  Ban,
  User,
  MessageSquare,
} from "lucide-react";
import { Incident } from "@shared/types/incidents";
import { formatDistanceToNow, format } from "date-fns";

import { INCIDENT_STATUSES, INCIDENT_SEVERITIES } from "@shared/constants/statuses";
import { SignalEvent } from "@shared/types/events";
import { updateIncident } from "../api";
import { useNotificationStore } from "../../notifications/store";
import { SarIntel } from "../sar";

export function IncidentDrawer({
  incident,
  events,
  sarIntel,
  onClose,
}: {
  incident: Incident;
  events: SignalEvent[];
  sarIntel: SarIntel | null;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState((incident as any).notes || "");
  const [assignedTo, setAssignedTo] = useState((incident as any).assignedTo || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const addToast = useNotificationStore((s) => s.addToast);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateIncident(incident.id, { status: newStatus });
      addToast("Incident Updated", `Status changed to ${newStatus}`, "success");
      onClose();
    } catch (e) {
      addToast("Update Failed", "Could not update incident", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsUpdating(true);
    try {
      await updateIncident(incident.id, { notes });
      addToast("Notes Saved", "Incident notes have been updated", "success");
    } catch (e) {
      addToast("Save Failed", "Could not save notes", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async () => {
    setIsUpdating(true);
    try {
      await updateIncident(incident.id, { assignedTo });
      addToast("Operator Assigned", `Assigned to ${assignedTo || "unassigned"}`, "success");
    } catch (e) {
      addToast("Assignment Failed", "Could not assign operator", "error");
    } finally {
      setIsUpdating(false);
    }
  };

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
          {sarIntel && (
            <div className="border border-[#1f1f1f] bg-[#090909]">
              <div className="px-3 py-2 border-b border-[#1f1f1f] bg-[#101010]">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#f97316]">
                  {sarIntel.brief.headline}
                </div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  {sarIntel.brief.priority}
                </div>
              </div>
              <div className="px-3 py-3 space-y-3">
                <p className="text-[11px] leading-5 text-zinc-300">
                  {sarIntel.brief.summary}
                </p>
                <div className="border border-[#1f1f1f] bg-black px-3 py-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#666]">
                    Recommended Action
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-200">
                    {sarIntel.brief.recommendedAction}
                  </p>
                </div>
                <div className="space-y-2">
                  {sarIntel.brief.lines.map((line) => (
                    <div key={line} className="text-[10px] font-mono text-zinc-400 leading-5">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

        {sarIntel && (
          <div className="space-y-3">
            <h3 className="hud-text-muted mb-3">PROBABLE SEARCH AREA</h3>
            <div className="grid grid-cols-2 gap-2">
              <DataTile
                label="SEARCH WINDOW"
                value={`${sarIntel.searchArea.searchWindowHours} hr`}
              />
              <DataTile
                label="AREA SIZE"
                value={`${Math.round(sarIntel.searchArea.areaKm2)} km2`}
              />
              <DataTile
                label="MAJOR AXIS"
                value={`${Math.round(sarIntel.searchArea.semiMajorKm * 2)} km`}
              />
              <DataTile
                label="MINOR AXIS"
                value={`${Math.round(sarIntel.searchArea.semiMinorKm * 2)} km`}
              />
              <DataTile
                label="SEARCH BEARING"
                value={`${Math.round(sarIntel.searchArea.headingDeg)} deg`}
              />
              <DataTile
                label="LAST SIGNAL AGE"
                value={formatRelativeMinutes(sarIntel.searchArea.ageMinutes)}
              />
              <DataTile
                label="DRIFT FACTOR"
                value={sarIntel.searchArea.driftFactor.toFixed(2)}
              />
              <DataTile
                label="COVERAGE"
                value={`${sarIntel.coverage.score.toFixed(0)} ${sarIntel.coverage.label}`}
              />
            </div>
          </div>
        )}

        {sarIntel && (
          <div>
            <h3 className="hud-text-muted mb-3">COVERAGE CONFIDENCE</h3>
            <div className="border border-[#1f1f1f] bg-[#090909]">
              <div className="grid grid-cols-3 gap-px bg-[#1f1f1f]">
                <DataTile label="CONFIDENCE SCORE" value={`${sarIntel.coverage.score.toFixed(0)}%`} />
                <DataTile label="RECEIVERS" value={`${sarIntel.coverage.nearbyReceivers}`} />
                <DataTile label="LIVE ASSETS" value={`${sarIntel.coverage.mobileAssets}`} />
              </div>
              <div className="px-3 py-3 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#22d3ee]">
                  {sarIntel.coverage.label} coverage support
                </div>
                {sarIntel.coverage.notes.map((note) => (
                  <div key={note} className="text-[10px] font-mono leading-5 text-zinc-400">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sarIntel && sarIntel.recommendations.length > 0 && (
          <div>
            <h3 className="hud-text-muted mb-3">INTERCEPT RECOMMENDATIONS</h3>
            <div className="space-y-2">
              {sarIntel.recommendations.map((recommendation, index) => (
                <div key={recommendation.asset.id} className="border border-[#1f1f1f] bg-[#0b0b0b] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#666]">
                        Option {index + 1} // {recommendation.asset.kind}
                      </div>
                      <div className="mt-1 text-[12px] font-mono text-zinc-100">
                        {recommendation.asset.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#666]">
                        ETA
                      </div>
                      <div className="mt-1 text-[12px] font-mono text-[#22c55e]">
                        {formatRelativeMinutes(recommendation.etaMinutes)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-400">
                    {recommendation.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sarIntel && sarIntel.dispatchTasks.length > 0 && (
          <div>
            <h3 className="hud-text-muted mb-3">DISPATCH TASKING</h3>
            <div className="space-y-2">
              {sarIntel.dispatchTasks.map((task) => (
                <div key={task.id} className="border border-[#1f1f1f] bg-[#0b0b0b] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#666]">
                        {task.owner}
                      </div>
                      <div className="mt-1 text-[12px] font-mono text-zinc-100">
                        {task.title}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#666]">
                        {task.status}
                      </div>
                      <div className="mt-1 text-[12px] font-mono text-[#f97316]">{task.etaLabel}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-400">
                    {task.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detection History */}
        <div>
          <h3 className="hud-text-muted mb-3">
            DETECTION HISTORY
          </h3>
          {events.length === 0 ? (
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

        {/* Action Buttons */}
        <div className="border-t border-[#1f1f1f] pt-4 space-y-3">
          <h3 className="hud-text-muted mb-3">ACTIONS</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleStatusChange("resolved")}
              disabled={isUpdating || incident.status === "resolved"}
              className="flex items-center justify-center py-2 px-3 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/30 text-[#22c55e] text-[10px] font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3 h-3 mr-1.5" />
              RESOLVE
            </button>
            <button
              onClick={() => handleStatusChange("dismissed")}
              disabled={isUpdating || incident.status === "dismissed"}
              className="flex items-center justify-center py-2 px-3 bg-[#666]/10 hover:bg-[#666]/20 border border-[#666]/30 text-[#999] text-[10px] font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              <Ban className="w-3 h-3 mr-1.5" />
              FALSE POSITIVE
            </button>
          </div>

          {/* Assign Operator */}
          <div>
            <div className="flex items-center text-[#666] mb-2">
              <User className="w-3 h-3 mr-1.5" />
              <span className="text-[10px] font-mono uppercase tracking-widest">ASSIGN OPERATOR</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Operator name"
                className="flex-1 bg-[#111] border border-[#1f1f1f] px-2 py-1.5 text-[11px] font-mono text-zinc-300 placeholder:text-[#444] focus:outline-none focus:border-[#333]"
              />
              <button
                onClick={handleAssign}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[10px] font-mono uppercase tracking-widest text-zinc-300 transition-colors disabled:opacity-50"
              >
                ASSIGN
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center text-[#666] mb-2">
              <MessageSquare className="w-3 h-3 mr-1.5" />
              <span className="text-[10px] font-mono uppercase tracking-widest">NOTES</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add incident notes..."
              rows={3}
              className="w-full bg-[#111] border border-[#1f1f1f] px-2 py-1.5 text-[11px] font-mono text-zinc-300 placeholder:text-[#444] focus:outline-none focus:border-[#333] resize-none"
            />
            <button
              onClick={handleSaveNotes}
              disabled={isUpdating}
              className="mt-2 w-full py-1.5 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[10px] font-mono uppercase tracking-widest text-zinc-300 transition-colors disabled:opacity-50"
            >
              SAVE NOTES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#1f1f1f] bg-[#0b0b0b] px-3 py-2">
      <div className="text-[9px] font-mono uppercase tracking-widest text-[#666]">
        {label}
      </div>
      <div className="mt-1 text-[12px] font-mono text-zinc-100">
        {value}
      </div>
    </div>
  );
}

function formatRelativeMinutes(value: number) {
  if (value < 60) {
    return `${Math.round(value)} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
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
