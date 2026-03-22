import React from "react";
import { Outlet, NavLink } from "react-router";
import { Map, Radio, BarChart2, List } from "lucide-react";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-300 font-sans md:h-screen md:flex-row md:overflow-hidden">
      <aside className="z-20 flex w-full shrink-0 flex-col border-b border-[#1f1f1f] bg-[#0a0a0a] md:h-full md:w-64 md:border-b-0 md:border-r">
        <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[#1f1f1f] px-4 py-3 md:justify-start md:px-6">
          <div className="flex items-center min-w-0">
            <Radio className="h-5 w-5 shrink-0 text-zinc-500" />
            <div className="ml-3 flex min-w-0 flex-col">
              <span className="truncate font-bold text-base tracking-[0.2em] uppercase text-zinc-100 leading-none md:text-lg">
                SentriX
              </span>
              <span className="hud-text-muted mt-1 truncate">/SYS_CORE_ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            </div>
            <span className="hud-text-muted text-[#22c55e]">LINK ESTABLISHED</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-stretch gap-px p-2 md:flex-1 md:flex-col md:gap-1 md:px-0 md:py-4">
          <NavItem
            to="/operations"
            icon={<Map className="w-4 h-4" />}
            label="Operations"
          />
          <NavItem
            to="/incidents"
            icon={<List className="w-4 h-4" />}
            label="Incidents"
          />
          <NavItem
            to="/health"
            icon={<Radio className="w-4 h-4" />}
            label="Infrastructure"
          />
          <NavItem
            to="/analytics"
            icon={<BarChart2 className="w-4 h-4" />}
            label="Analytics"
          />
        </nav>

        <div className="hidden border-t border-[#1f1f1f] p-4 md:block">
          <div className="flex items-center justify-center gap-3 md:justify-start md:px-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            </div>
            <span className="hud-text-muted text-[#22c55e]">LINK ESTABLISHED</span>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-0 flex-1 flex-col bg-black md:overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-w-[calc(50%-2px)] flex-1 items-center justify-center gap-2 rounded-sm border border-[#1f1f1f] px-3 py-3 text-center transition-colors md:min-w-0 md:justify-start md:rounded-none md:border-x-0 md:border-y-0 md:border-l-2 md:px-4 ${
          isActive
            ? "bg-[#111] text-zinc-100 border-[#f97316]"
            : "text-[#666] hover:bg-[#111] hover:text-zinc-300 border-transparent"
        }`
      }
    >
      <div className="flex items-center justify-center w-8 h-8 opacity-70">{icon}</div>
      <span className="text-[10px] font-mono uppercase tracking-[0.15em] sm:text-[11px] md:block">{label}</span>
    </NavLink>
  );
}
