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
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[#1f1f1f] p-4">
        <h2 className="flex items-center text-sm font-mono uppercase tracking-[0.15em] text-zinc-100">
          <Activity className="mr-2 h-4 w-4 text-[#f97316]" />
          Live Event Stream
        </h2>
        <span className="border border-[#1f1f1f] bg-[#111] px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#22c55e]">
          LIVE
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="py-8 text-center hud-text-muted">
            /WAITING_FOR_SIGNALS...
          </div>
        ) : (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="w-full cursor-pointer border border-[#1f1f1f] bg-black p-3 text-left transition-colors hover:border-[#333]"
              onClick={() => onSelectIncident(event.incidentId)}
            >
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#f97316] break-all">
                  [{event.eventType}]
                </span>
                <span className="text-[10px] font-mono text-[#666]">
                  {formatDistanceToNow(new Date(event.detectedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="mb-2 break-all text-xs font-mono text-zinc-300">
                INCIDENT: <span className="text-zinc-100">{event.incidentId}</span>
              </div>

              <div className="flex items-center text-[10px] font-mono uppercase tracking-wider text-[#666]">
                <Radio className="mr-1 h-3 w-3 shrink-0" />
                <span className="break-all">{event.stationCode || event.receiverStationId}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
