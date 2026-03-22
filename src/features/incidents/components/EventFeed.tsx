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
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] p-4">
        <h2 className="flex items-center text-base font-mono uppercase tracking-[0.15em] text-zinc-100 md:text-sm">
          <Activity className="mr-2 h-4 w-4 text-[#f97316]" />
          Live Event Stream
        </h2>
        <span className="border border-[#1f1f1f] bg-[#111] px-2 py-1 text-[11px] font-mono uppercase tracking-widest text-[#22c55e] md:py-0.5 md:text-[10px]">
          LIVE
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono uppercase tracking-[0.18em] text-[#666] md:text-[10px]">
            /WAITING_FOR_SIGNALS...
          </div>
        ) : (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="touch-target w-full border border-[#1f1f1f] bg-black p-3 text-left transition-colors hover:border-[#333]"
              onClick={() => onSelectIncident(event.incidentId)}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#f97316] md:text-[10px]">
                  [{event.eventType}]
                </span>
                <span className="text-[11px] font-mono text-[#666] md:text-[10px]">
                  {formatDistanceToNow(new Date(event.detectedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="mb-2 text-sm font-mono text-zinc-300 md:text-xs">
                INCIDENT: <span className="text-zinc-100">{event.incidentId}</span>
              </div>

              <div className="flex items-center text-[11px] font-mono uppercase tracking-wider text-[#666] md:text-[10px]">
                <Radio className="mr-1 h-3.5 w-3.5" />
                {event.stationCode || event.receiverStationId}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
