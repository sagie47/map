import React from "react";
import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAnalytics } from "../hooks";

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#ef4444"];

export function AnalyticsView() {
  const { data, isLoading, error } = useAnalytics();

  if (error) {
    return <div className="p-6 sm:p-8 hud-text-muted text-red-500">/ERROR_LOADING_DATA</div>;
  }

  if (isLoading || !data) {
    return <div className="p-6 sm:p-8 hud-text-muted">/LOADING_DATA...</div>;
  }

  const totalDomainIncidents = data.domainStats.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="h-full overflow-y-auto bg-black p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium tracking-widest text-zinc-100 uppercase sm:text-2xl">
            System Analytics
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="block h-1.5 w-1.5 bg-[#22c55e]"></span>
            <span className="hud-text-muted text-[#22c55e]">/MODE ANALYSIS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <div className="hud-panel flex flex-col p-4 sm:p-5">
            <div className="mb-6 flex items-center justify-between gap-2">
              <h2 className="hud-text-muted">INCIDENT INDEX</h2>
              <span className="text-[#333]">↗</span>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 border-b border-[#1f1f1f] pb-4 sm:grid-cols-4">
              <Metric label="Total" value={data.totalIncidents} />
              <Metric label="Active" value={data.activeIncidents} valueClassName="text-[#f97316]" />
              <Metric label="Resolved" value={data.totalIncidents - data.activeIncidents} />
              <Metric label="False" value={data.falsePositives} valueClassName="text-[#ef4444]" />
            </div>

            <div className="flex-1 space-y-4">
              {data.domainStats.map((stat: any, i: number) => (
                <div key={stat.name} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="truncate font-mono capitalize text-zinc-300">{stat.name}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[#666]">
                    {totalDomainIncidents > 0 ? ((stat.value / totalDomainIncidents) * 100).toFixed(2) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hud-panel flex flex-col p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="hud-text-muted">INCIDENT FREQUENCY DELTA</h2>
              <span className="text-[#333]">↗</span>
            </div>
            <div className="mb-4 text-2xl hud-value sm:text-3xl">+12<span className="text-sm text-[#666]">%</span></div>

            <div className="mt-auto h-32 w-full sm:h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeSeries}>
                  <Tooltip
                    cursor={{ fill: "#111" }}
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      borderColor: "#1f1f1f",
                      color: "#ccc",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      borderRadius: "0",
                    }}
                    itemStyle={{ color: "#f97316" }}
                  />
                  <Bar dataKey="incidents" fill="#333" activeBar={{ fill: "#f97316" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-between gap-3 border-t border-[#1f1f1f] pt-2">
              <span className="hud-text-muted truncate">{data.timeSeries[0]?.name}</span>
              <span className="hud-text-muted truncate text-right">{data.timeSeries[data.timeSeries.length - 1]?.name}</span>
            </div>
          </div>

          <div className="hud-panel flex flex-col p-4 sm:p-5">
            <div className="mb-6 flex items-center justify-between gap-2">
              <h2 className="hud-text-muted">ACTIVE INCIDENT COUNT</h2>
              <span className="text-[#333]">↗</span>
            </div>

            <div className="relative flex min-h-56 flex-1 flex-col items-center justify-center sm:min-h-64">
              <div className="absolute top-0 h-32 w-full sm:h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: data.activeIncidents }, { value: Math.max(100 - data.activeIncidents, 0) }]}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={64}
                      outerRadius={66}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#f97316" />
                      <Cell fill="#1f1f1f" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="z-10 mt-12 text-center sm:mt-16">
                <div className="text-4xl hud-value sm:text-5xl">{data.activeIncidents}</div>
                <div className="mt-2 flex cursor-pointer items-center justify-center gap-1 hud-text-muted hover:text-zinc-300">
                  Details <span className="text-[8px]">▼</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hud-panel flex flex-col p-4 sm:p-5">
            <div className="mb-6 flex items-center justify-between gap-2">
              <h2 className="hud-text-muted">SYSTEM HEALTH</h2>
              <span className="text-[#333]">↗</span>
            </div>

            <div className="mb-6">
              <div className="hud-text-muted mb-1">RECEIVER UPTIME</div>
              <div className="flex items-end gap-1">
                <span className="text-2xl hud-value sm:text-3xl">{data.receiverUptime.toFixed(1)}</span>
                <span className="mb-1 hud-text-muted">%</span>
              </div>
            </div>

            <div className="mt-auto space-y-5">
              <ProgressMetric
                label="FALSE POSITIVE RATE"
                value={`${((data.falsePositives / Math.max(data.totalIncidents, 1)) * 100).toFixed(1)}% OF TOTAL INCIDENTS`}
                width={Math.min((data.falsePositives / Math.max(data.totalIncidents, 1)) * 100, 100)}
                barClassName="bg-[#f97316]"
              />
              <ProgressMetric
                label="INFRASTRUCTURE LOAD"
                value="NOMINAL OPERATING PARAMETERS"
                width={42}
                barClassName="bg-[#22c55e]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className="hud-text-muted mb-1">{label}</div>
      <div className={`text-lg hud-value ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  width,
  barClassName,
}: {
  label: string;
  value: string;
  width: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3">
        <span className="hud-text-muted">{label}</span>
      </div>
      <div className="h-1 w-full bg-[#1f1f1f]">
        <div className={`h-full ${barClassName}`} style={{ width: `${width}%` }}></div>
      </div>
      <div className="mt-1 text-[8px] text-[#444] hud-text-muted">
        {value}
      </div>
    </div>
  );
}
