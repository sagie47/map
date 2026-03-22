import React from "react";
import { RECEIVER_STATUSES } from "../../../../shared/constants/statuses";
import { Activity, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useReceivers } from "../hooks";

export function ReceiverHealthView() {
  const { data: receivers = [], isLoading, error } = useReceivers();

  if (error) {
    return <div className="p-8 hud-text-muted text-red-500">/ERROR_LOADING_RECEIVER_STATUS</div>;
  }

  if (isLoading) {
    return <div className="p-8 hud-text-muted">/LOADING_RECEIVER_STATUS...</div>;
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-black safe-area-inset">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-sans font-medium text-zinc-100 tracking-widest uppercase">
            Receiver Infrastructure
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 bg-[#22c55e] block"></span>
            <span className="hud-text-muted text-[#22c55e]">/SYS_HEALTH_MONITOR</span>
          </div>
        </div>

        {/* Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {receivers.map((receiver) => (
            <div
              key={receiver.id}
              className="hud-panel p-4 md:p-6 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 truncate">
                    {receiver.stationName}
                  </h3>
                  <p className="text-[10px] font-mono text-[#666] mt-1 truncate">
                    ID: {receiver.stationCode}
                  </p>
                </div>
                <StatusBadge status={receiver.status} />
              </div>

              <div className="space-y-2 md:space-y-3 mt-4 md:mt-6">
                {/* Location - stack on mobile, row on larger screens */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                  <div className="flex items-center min-w-0">
                    <MapPin className="w-3 h-3 text-[#666] mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-zinc-400 tracking-widest text-[10px] sm:text-[11px]">LOC</span>
                  </div>
                  <span className="text-[#666] sm:ml-auto text-[10px] sm:text-[11px] truncate max-w-full sm:max-w-[120px]">
                    {receiver.region}
                  </span>
                </div>

                {/* Coordinates - hidden on mobile, visible on sm+ */}
                <div className="hidden sm:flex flex-row items-center gap-1 sm:gap-0">
                  <div className="flex items-center min-w-0">
                    <span className="text-zinc-500 tracking-widest text-[10px]">COORD</span>
                  </div>
                  <span className="text-[#666] sm:ml-auto text-[10px] sm:text-[11px]">
                    {receiver.lat.toFixed(2)}, {receiver.lng.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                  <div className="flex items-center min-w-0">
                    <Clock className="w-3 h-3 text-[#666] mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-zinc-400 tracking-widest text-[10px] sm:text-[11px]">HEARTBEAT</span>
                  </div>
                  <span className="text-[#666] sm:ml-auto text-[10px] sm:text-[11px] truncate">
                    {formatDistanceToNow(new Date(receiver.lastHeartbeatAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                  <div className="flex items-center min-w-0">
                    <Activity className="w-3 h-3 text-[#666] mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-zinc-400 tracking-widest text-[10px] sm:text-[11px]">DELAY</span>
                  </div>
                  <span
                    className={`sm:ml-auto text-[10px] sm:text-[11px] ${receiver.packetDelayMs > 100 ? "text-red-500" : "text-[#22c55e]"}`}
                  >
                    {receiver.packetDelayMs} MS
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors =
    {
      [RECEIVER_STATUSES.ONLINE]: "bg-[#111] text-[#22c55e] border-[#1f1f1f]",
      [RECEIVER_STATUSES.DEGRADED]: "bg-[#111] text-yellow-500 border-[#1f1f1f]",
      [RECEIVER_STATUSES.OFFLINE]: "bg-[#111] text-red-500 border-[#1f1f1f]",
    }[status] || "bg-black text-[#666] border-[#1f1f1f]";

  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border ${colors}`}
    >
      {status}
    </span>
  );
}
