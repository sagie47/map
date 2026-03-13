import React from "react";
import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useAnalytics } from "../hooks";

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#ef4444'];

export function AnalyticsView() {
  const { data, isLoading, error } = useAnalytics();

  if (error) {
    return <div className="p-8 hud-text-muted text-red-500">/ERROR_LOADING_DATA</div>;
  }

  if (isLoading || !data)
    return <div className="p-8 hud-text-muted">/LOADING_DATA...</div>;

  const totalDomainIncidents = data.domainStats.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="p-6 h-full overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-sans font-medium text-zinc-100 tracking-widest uppercase">
            System Analytics
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 bg-[#22c55e] block"></span>
            <span className="hud-text-muted text-[#22c55e]">/MODE ANALYSIS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Panel 1: Performance Index */}
          <div className="hud-panel p-5 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="hud-text-muted">INCIDENT INDEX</h2>
              <span className="text-[#333]">↗</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-6 border-b border-[#1f1f1f] pb-4">
              <div>
                <div className="hud-text-muted mb-1">Total</div>
                <div className="hud-value text-lg">{data.totalIncidents}</div>
              </div>
              <div>
                <div className="hud-text-muted mb-1">Active</div>
                <div className="hud-value text-lg text-[#f97316]">{data.activeIncidents}</div>
              </div>
              <div>
                <div className="hud-text-muted mb-1">Resolved</div>
                <div className="hud-value text-lg">{data.totalIncidents - data.activeIncidents}</div>
              </div>
              <div>
                <div className="hud-text-muted mb-1">False</div>
                <div className="hud-value text-lg text-[#ef4444]">{data.falsePositives}</div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {data.domainStats.map((stat: any, i: number) => (
                <div key={stat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="font-mono text-zinc-300 capitalize">{stat.name}</span>
                  </div>
                  <span className="font-mono text-[#666]">
                    {totalDomainIncidents > 0 ? ((stat.value / totalDomainIncidents) * 100).toFixed(2) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 2: OPS Performance Delta */}
          <div className="hud-panel p-5 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="hud-text-muted">INCIDENT FREQUENCY DELTA</h2>
              <span className="text-[#333]">↗</span>
            </div>
            <div className="hud-value text-3xl mb-4">+12<span className="text-sm text-[#666]">%</span></div>
            
            <div className="h-32 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeSeries}>
                  <Tooltip
                    cursor={{ fill: '#111' }}
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      borderColor: "#1f1f1f",
                      color: "#ccc",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      borderRadius: "0"
                    }}
                    itemStyle={{ color: "#f97316" }}
                  />
                  <Bar dataKey="incidents" fill="#333" activeBar={{ fill: '#f97316' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2 border-t border-[#1f1f1f] pt-2">
              <span className="hud-text-muted">{data.timeSeries[0]?.name}</span>
              <span className="hud-text-muted">{data.timeSeries[data.timeSeries.length - 1]?.name}</span>
            </div>
          </div>

          {/* Panel 3: Critical Error Count */}
          <div className="hud-panel p-5 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="hud-text-muted">ACTIVE INCIDENT COUNT</h2>
              <span className="text-[#333]">↗</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="h-32 w-full absolute top-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: data.activeIncidents }, { value: Math.max(100 - data.activeIncidents, 0) }]}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={82}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#f97316" />
                      <Cell fill="#1f1f1f" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-12 z-10">
                <div className="hud-value text-5xl">{data.activeIncidents}</div>
                <div className="hud-text-muted mt-2 flex items-center justify-center gap-1 cursor-pointer hover:text-zinc-300">
                  Details <span className="text-[8px]">▼</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 4: System Health */}
          <div className="hud-panel p-5 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="hud-text-muted">SYSTEM HEALTH</h2>
              <span className="text-[#333]">↗</span>
            </div>
            
            <div className="mb-6">
              <div className="hud-text-muted mb-1">RECEIVER UPTIME</div>
              <div className="flex items-end gap-1">
                <span className="hud-value text-3xl">{data.receiverUptime.toFixed(1)}</span>
                <span className="hud-text-muted mb-1">%</span>
              </div>
            </div>

            <div className="space-y-5 mt-auto">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="hud-text-muted">FALSE POSITIVE RATE</span>
                </div>
                <div className="h-1 w-full bg-[#1f1f1f]">
                  <div 
                    className="h-full bg-[#f97316]" 
                    style={{ width: `${Math.min((data.falsePositives / Math.max(data.totalIncidents, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="hud-text-muted mt-1 text-[8px] text-[#444]">
                  {((data.falsePositives / Math.max(data.totalIncidents, 1)) * 100).toFixed(1)}% OF TOTAL INCIDENTS
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="hud-text-muted">INFRASTRUCTURE LOAD</span>
                </div>
                <div className="h-1 w-full bg-[#1f1f1f]">
                  <div className="h-full bg-[#22c55e]" style={{ width: '42%' }}></div>
                </div>
                <div className="hud-text-muted mt-1 text-[8px] text-[#444]">
                  NOMINAL OPERATING PARAMETERS
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
