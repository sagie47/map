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
    return <div className="p-6 sm:p-8 hud-text-muted text-red-500">/ERROR_LOADING_INCIDENTS</div>;
  }

  if (isLoading) {
    return <div className="p-6 sm:p-8 hud-text-muted">/LOADING_INCIDENTS...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-black p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-widest text-zinc-100 uppercase sm:text-2xl">
              Incident Directory
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="block h-1.5 w-1.5 bg-[#f97316]"></span>
              <span className="hud-text-muted text-[#f97316]">/MODE ARCHIVE</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <div className="relative min-w-0 flex-1 sm:min-w-64 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              <input
                type="text"
                placeholder="SEARCH ID OR BEACON..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-[#1f1f1f] bg-[#0a0a0a] py-2 pl-9 pr-4 text-[11px] font-mono uppercase tracking-widest text-zinc-100 placeholder:text-[#666] transition-colors focus:border-[#f97316] focus:outline-none sm:w-72"
              />
            </div>

            <select
              className="w-full border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-zinc-100 transition-colors focus:border-[#f97316] focus:outline-none sm:w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">ALL STATUSES</option>
              <option value={INCIDENT_STATUSES.ACTIVE}>ACTIVE ONLY</option>
              <option value={INCIDENT_STATUSES.RESOLVED}>RESOLVED ONLY</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          {filteredIncidents.map((incident) => (
            <article key={incident.id} className="hud-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-100 break-all">
                    {incident.id}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] border ${
                        incident.status === INCIDENT_STATUSES.ACTIVE
                          ? "bg-[#111] text-[#22c55e] border-[#1f1f1f]"
                          : "bg-black text-[#666] border-[#1f1f1f]"
                      }`}
                    >
                      {incident.status}
                    </span>
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
                    <span className="px-2 py-0.5 text-[10px] border border-[#1f1f1f] bg-black text-zinc-300">
                      {incident.domainType}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/operations?incident=${incident.id}`)}
                  className="text-left text-[#f97316] transition-colors hover:text-[#ff8a3d] sm:text-right"
                >
                  [VIEW]
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[#1f1f1f] pt-4 sm:grid-cols-2">
                <div>
                  <dt className="hud-text-muted mb-1">FIRST SEEN</dt>
                  <dd className="text-[11px] font-mono text-zinc-300">
                    {format(new Date(incident.firstSeenAt), "MMM d, HH:mm")}
                  </dd>
                </div>
                <div>
                  <dt className="hud-text-muted mb-1">LAST SEEN</dt>
                  <dd className="text-[11px] font-mono text-zinc-300">
                    {formatDistanceToNow(new Date(incident.lastSeenAt), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden lg:block hud-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              <thead className="border-b border-[#1f1f1f] bg-[#111] text-[#666]">
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
                  <tr
                    key={incident.id}
                    className="transition-colors hover:bg-[#111]"
                  >
                    <td className="px-6 py-4 text-zinc-300">
                      {incident.id}
                    </td>
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
                    <td className="px-6 py-4 text-zinc-300">
                      {incident.domainType}
                    </td>
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
                        onClick={() =>
                          navigate(`/operations?incident=${incident.id}`)
                        }
                        className="text-[#f97316] transition-colors hover:text-[#ff8a3d]"
                      >
                        [VIEW]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredIncidents.length === 0 && (
          <div className="hud-panel p-8 text-center hud-text-muted">
            /NO_INCIDENTS_MATCHING_FILTERS
          </div>
        )}
      </div>
    </div>
  );
}
