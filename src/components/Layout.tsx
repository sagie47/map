import React from "react";
import { Outlet, NavLink } from "react-router";
import { Activity, Map, Radio, BarChart2, Settings, List } from "lucide-react";

export function Layout() {
  return (
    <div className="flex h-screen md:h-screen overflow-hidden bg-black text-zinc-300 font-sans">
      {/* Sidebar - collapsed to icons on mobile, expanded on md+ */}
      <aside className="w-14 md:w-16 lg:w-64 bg-[#0a0a0a] border-r border-[#1f1f1f] flex flex-col z-20 flex-shrink-0">
        <div className="h-14 md:h-16 flex items-center justify-center md:justify-start md:px-4 lg:px-6 border-b border-[#1f1f1f]">
          <Radio className="w-5 h-5 text-zinc-500" />
          <div className="ml-2 md:ml-3 hidden lg:flex flex-col">
            <span className="font-bold text-lg tracking-[0.2em] uppercase text-zinc-100 leading-none">
              SentriX
            </span>
            <span className="hud-text-muted mt-1">/SYS_CORE_ONLINE</span>
          </div>
        </div>

        <nav className="flex-1 py-2 md:py-4 flex flex-col gap-1 px-0">
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

        <div className="p-2 md:p-4 border-t border-[#1f1f1f]">
          <div className="flex items-center justify-center md:justify-start lg:px-2 gap-2 md:gap-3">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            </div>
            <span className="hud-text-muted text-[#22c55e] hidden lg:block">
              LINK ESTABLISHED
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0 bg-black">
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
        `flex items-center px-4 py-3 transition-colors border-l-2 ${
          isActive
            ? "bg-[#111] text-zinc-100 border-[#f97316]"
            : "text-[#666] hover:bg-[#111] hover:text-zinc-300 border-transparent"
        }`
      }
    >
      <div className="flex items-center justify-center w-8 h-8 opacity-70">{icon}</div>
      <span className="ml-2 hidden md:block text-[11px] font-mono uppercase tracking-[0.15em]">{label}</span>
    </NavLink>
  );
}
