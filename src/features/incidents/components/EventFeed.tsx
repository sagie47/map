import { SignalEvent } from "@shared/types/events";
import { formatDistanceToNow } from "date-fns";
import { Activity, Radio } from "lucide-react";

export function EventFeed({
  events,
  onSelectIncident,
}: {
  events: SignalEvent[];
  onSelectIncident: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 flex items-center">
          <Activity className="w-4 h-4 mr-2 text-[#f97316]" />
          Live Event Stream
        </h2>
        <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[#111] text-[#22c55e] border border-[#1f1f1f]">
          LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {events.length === 0 ? (
          <div className="text-center hud-text-muted py-8">/WAITING_FOR_SIGNALS...</div>
        ) : (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="touch-target w-full min-h-11 p-3 bg-black border border-[#1f1f1f] hover:border-[#333] transition-colors text-left"
              onClick={() => onSelectIncident(event.incidentId)}
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <span className="text-[10px] font-mono text-[#f97316] uppercase tracking-[0.15em]">
                  [{event.eventType}]
                </span>
                <span className="text-[10px] font-mono text-[#666] whitespace-nowrap">
                  {formatDistanceToNow(new Date(event.detectedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="text-xs font-mono text-zinc-300 mb-2">
                INCIDENT: <span className="text-zinc-100">{event.incidentId}</span>
              </div>

              <div className="flex items-center text-[10px] font-mono text-[#666] uppercase tracking-wider">
                <Radio className="w-3 h-3 mr-1" />
                {event.stationCode || event.receiverStationId}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
