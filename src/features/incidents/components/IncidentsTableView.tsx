import React, { useState } from "react";
import { useNavigate } from "react-router";
import { INCIDENT_STATUSES, INCIDENT_SEVERITIES } from "@shared/constants/statuses";
import { Search } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useIncidents } from "../hooks";

export function IncidentsTableView() {
  const { data: incidents = [], isLoading, error } = useIncidents();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredIncidents = incidents.filter((i) => {
    if (filter === INCIDENT_STATUSES.ACTIVE && i.status !== INCIDENT_STATUSES.ACTIVE) return false;
    if (filter === INCIDENT_STATUSES.RESOLVED && i.status !== INCIDENT_STATUSES.RESOLVED) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!i.id.toLowerCase().includes(query) && !i.beaconId.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });

  if (error) {
    return <div className="p-8 hud-text-muted text-red-500">/ERROR_LOADING_INCIDENTS</div>;
  }

  if (isLoading) {
    return <div className="p-8 hud-text-muted">/LOADING_INCIDENTS...</div>;
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-sans font-medium text-zinc-100 tracking-widest uppercase">
              Incident Directory
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 bg-[#f97316] block"></span>
              <span className="hud-text-muted text-[#f97316]">/MODE ARCHIVE</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none" />
              <input
                type="text"
                placeholder="SEARCH ID OR BEACON..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="touch-target-field pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-none text-[11px] font-mono uppercase tracking-widest text-zinc-100 focus:outline-none focus:border-[#f97316] transition-colors w-full sm:w-64 placeholder:text-[#666]"
              />
            </div>

            <select
              className="touch-target-field px-4 py-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-none text-[11px] font-mono uppercase tracking-widest text-zinc-100 focus:outline-none focus:border-[#f97316] transition-colors"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">ALL STATUSES</option>
              <option value={INCIDENT_STATUSES.ACTIVE}>ACTIVE ONLY</option>
              <option value={INCIDENT_STATUSES.RESOLVED}>RESOLVED ONLY</option>
            </select>
          </div>
        </div>

        <div className="hud-panel overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            <thead className="text-[#666] bg-[#111] border-b border-[#1f1f1f]">
              <tr>
                <th className="px-6 py-4 font-normal">INCIDENT ID</th>
                <th className="px-6 py-4 font-normal">STATUS</th>
                <th className="px-6 py-4 font-normal">SEVERITY</th>
                <th className="px-6 py-4 font-normal">DOMAIN</th>
                <th className="px-6 py-4 font-normal">FIRST SEEN</th>
                <th className="px-6 py-4 font-normal">LAST SEEN</th>
                <th className="px-6 py-4 font-normal text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filteredIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-[#111] transition-colors">
                  <td className="px-6 py-4 text-zinc-300">{incident.id}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] border ${
                        incident.status === INCIDENT_STATUSES.ACTIVE
                          ? "bg-[#111] text-[#22c55e] border-[#1f1f1f]"
                          : "bg-black text-[#666] border-[#1f1f1f]"
                      }`}
                    >
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] border ${
                        {
                          [INCIDENT_SEVERITIES.LOW]: "bg-[#111] text-yellow-500 border-[#1f1f1f]",
                          [INCIDENT_SEVERITIES.MEDIUM]: "bg-[#111] text-[#f97316] border-[#1f1f1f]",
                          [INCIDENT_SEVERITIES.HIGH]: "bg-[#111] text-red-500 border-[#1f1f1f]",
                          [INCIDENT_SEVERITIES.CRITICAL]: "bg-[#111] text-rose-600 border-[#1f1f1f]",
                        }[incident.severity]
                      }`}
                    >
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{incident.domainType}</td>
                  <td className="px-6 py-4">
                    {format(new Date(incident.firstSeenAt), "MMM d, HH:mm")}
                  </td>
                  <td className="px-6 py-4">
                    {formatDistanceToNow(new Date(incident.lastSeenAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/operations?incident=${incident.id}`)}
                      className="touch-target inline-flex items-center justify-center px-3 text-[#f97316] hover:text-[#ff8a3d] transition-colors"
                    >
                      [VIEW]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredIncidents.length === 0 && (
            <div className="p-8 text-center hud-text-muted">
              /NO_INCIDENTS_MATCHING_FILTERS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
