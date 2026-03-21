import React, { useState } from "react";
import { Outlet, NavLink } from "react-router";
import { Activity, Map, Radio, BarChart2, Settings, List, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-black text-zinc-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#0a0a0a] border-r border-[#1f1f1f] flex flex-col z-20 transition-all duration-300 relative",
          isCollapsed ? "w-16" : "w-16 md:w-64"
        )}
      >
        <div className="h-16 flex items-center justify-center md:px-6 md:justify-start border-b border-[#1f1f1f]">
          <div className="flex items-center justify-center w-full md:w-auto overflow-hidden">
            <Radio className="w-5 h-5 text-zinc-500 flex-shrink-0" />
            <div className={cn("ml-3 flex-col hidden md:flex min-w-[120px]", isCollapsed && "md:hidden")}>
              <span className="font-bold text-lg tracking-[0.2em] uppercase text-zinc-100 leading-none">
                SentriX
              </span>
              <span className="hud-text-muted mt-1">/SYS_CORE_ONLINE</span>
            </div>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-[#1f1f1f] border border-[#333] rounded-full p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#333] transition-colors hidden md:flex z-50 shadow-md"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-0 overflow-x-hidden">
          <NavItem to="/operations" icon={<Map className="w-4 h-4" />} label="Operations" isCollapsed={isCollapsed} />
          <NavItem to="/incidents" icon={<List className="w-4 h-4" />} label="Incidents" isCollapsed={isCollapsed} />
          <NavItem to="/health" icon={<Radio className="w-4 h-4" />} label="Infrastructure" isCollapsed={isCollapsed} />
          <NavItem to="/analytics" icon={<BarChart2 className="w-4 h-4" />} label="Analytics" isCollapsed={isCollapsed} />
        </nav>

        <div className="p-4 border-t border-[#1f1f1f] overflow-hidden whitespace-nowrap">
          <div className="flex items-center justify-center md:justify-start md:px-2 gap-3">
            <div className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
            </div>
            <span className={cn("hud-text-muted text-[#22c55e] hidden md:block", isCollapsed && "md:hidden")}>
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
  isCollapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center px-4 py-3 transition-colors border-l-2 relative group",
          isActive
            ? "bg-[#111] text-zinc-100 border-[#f97316]"
            : "text-[#666] hover:bg-[#111] hover:text-zinc-300 border-transparent"
        )
      }
      title={isCollapsed ? label : undefined}
    >
      <div className="flex items-center justify-center w-8 h-8 opacity-70 flex-shrink-0">{icon}</div>
      <span className={cn(
        "ml-2 text-[11px] font-mono uppercase tracking-[0.15em] hidden md:block whitespace-nowrap",
        isCollapsed && "md:hidden"
      )}>
        {label}
      </span>
    </NavLink>
  );
}
