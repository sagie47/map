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
    <div className="p-6 h-full overflow-y-auto bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-sans font-medium text-zinc-100 tracking-widest uppercase">
            Receiver Infrastructure
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 bg-[#22c55e] block"></span>
            <span className="hud-text-muted text-[#22c55e]">/SYS_HEALTH_MONITOR</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {receivers.map((receiver) => (
            <div
              key={receiver.id}
              className="hud-panel p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100">
                    {receiver.stationName}
                  </h3>
                  <p className="text-[10px] font-mono text-[#666] mt-1">
                    ID: {receiver.stationCode}
                  </p>
                </div>
                <StatusBadge status={receiver.status} />
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center text-[11px] font-mono uppercase">
                  <MapPin className="w-3 h-3 text-[#666] mr-3" />
                  <span className="text-zinc-400 tracking-widest">{receiver.region}</span>
                  <span className="text-[#666] ml-auto">
                    {receiver.lat.toFixed(2)}, {receiver.lng.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center text-[11px] font-mono uppercase">
                  <Clock className="w-3 h-3 text-[#666] mr-3" />
                  <span className="text-zinc-400 tracking-widest">LAST_HEARTBEAT</span>
                  <span className="text-[#666] ml-auto">
                    {formatDistanceToNow(new Date(receiver.lastHeartbeatAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <div className="flex items-center text-[11px] font-mono uppercase">
                  <Activity className="w-3 h-3 text-[#666] mr-3" />
                  <span className="text-zinc-400 tracking-widest">PACKET_DELAY</span>
                  <span
                    className={`ml-auto ${receiver.packetDelayMs > 100 ? "text-red-500" : "text-[#22c55e]"}`}
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
