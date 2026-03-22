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
    <div className="h-full overflow-y-auto bg-black px-4 py-6 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-sans font-medium tracking-widest text-zinc-100 uppercase">
            Receiver Infrastructure
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="block h-1.5 w-1.5 bg-[#22c55e]"></span>
            <span className="hud-text-muted text-[#22c55e]">/SYS_HEALTH_MONITOR</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {receivers.map((receiver) => (
            <div
              key={receiver.id}
              className="hud-panel p-4 sm:p-6"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 break-words">
                    {receiver.stationName}
                  </h3>
                  <p className="mt-1 break-all text-[10px] font-mono text-[#666]">
                    ID: {receiver.stationCode}
                  </p>
                </div>
                <StatusBadge status={receiver.status} />
              </div>

              <div className="mt-6 space-y-3">
                <InfoRow
                  icon={<MapPin className="h-3 w-3 text-[#666]" />}
                  label={receiver.region}
                  value={`${receiver.lat.toFixed(2)}, ${receiver.lng.toFixed(2)}`}
                />

                <InfoRow
                  icon={<Clock className="h-3 w-3 text-[#666]" />}
                  label="LAST_HEARTBEAT"
                  value={formatDistanceToNow(new Date(receiver.lastHeartbeatAt), {
                    addSuffix: true,
                  })}
                />

                <InfoRow
                  icon={<Activity className="h-3 w-3 text-[#666]" />}
                  label="PACKET_DELAY"
                  value={`${receiver.packetDelayMs} MS`}
                  valueClassName={receiver.packetDelayMs > 100 ? "text-red-500" : "text-[#22c55e]"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueClassName = "text-[#666]",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-[11px] font-mono uppercase sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="min-w-0 break-words tracking-widest text-zinc-400">{label}</span>
      </div>
      <span className={`break-words sm:ml-auto sm:text-right ${valueClassName}`}>
        {value}
      </span>
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
      className={`w-fit px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border ${colors}`}
    >
      {status}
    </span>
  );
}
