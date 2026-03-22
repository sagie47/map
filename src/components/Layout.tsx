import type { ReactNode } from "react";
import { BarChart2, List, Map, Radio } from "lucide-react";
import { NavLink, Outlet } from "react-router";

const navItems = [
  {
    to: "/operations",
    icon: <Map className="h-4 w-4" />,
    label: "Operations",
  },
  {
    to: "/incidents",
    icon: <List className="h-4 w-4" />,
    label: "Incidents",
  },
  {
    to: "/health",
    icon: <Radio className="h-4 w-4" />,
    label: "Infrastructure",
  },
  {
    to: "/analytics",
    icon: <BarChart2 className="h-4 w-4" />,
    label: "Analytics",
  },
];

export function Layout() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-black font-sans text-zinc-300 md:h-screen md:min-h-0 md:flex-row md:overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur md:hidden pt-safe">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Radio className="h-5 w-5 shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <span className="block truncate text-lg leading-none font-bold uppercase tracking-[0.2em] text-zinc-100">
                SentriX
              </span>
              <span className="hud-text-muted mt-1 block truncate">/SYS_CORE_ONLINE</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]"></span>
            </span>
            <span className="hud-text-muted text-[#22c55e]">LINK</span>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-[#1f1f1f] px-3 py-3 pb-safe">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} mobile />
          ))}
        </nav>
      </header>

      <aside className="hidden w-16 shrink-0 flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] md:flex md:w-64">
        <div className="flex h-16 items-center justify-center border-b border-[#1f1f1f] md:justify-start md:px-6">
          <Radio className="h-5 w-5 text-zinc-500" />
          <div className="ml-3 hidden flex-col md:flex">
            <span className="text-lg leading-none font-bold uppercase tracking-[0.2em] text-zinc-100">
              SentriX
            </span>
            <span className="hud-text-muted mt-1">/SYS_CORE_ONLINE</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 py-4">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-[#1f1f1f] p-4">
          <div className="flex items-center justify-center gap-3 md:justify-start md:px-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]"></span>
            </span>
            <span className="hud-text-muted hidden text-[#22c55e] md:block">
              LINK ESTABLISHED
            </span>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-black">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  mobile = false,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  mobile?: boolean;
  key?: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const baseClasses = isActive
          ? "bg-[#111] text-zinc-100 border-[#f97316]"
          : "border-transparent text-[#666] hover:bg-[#111] hover:text-zinc-300";

        return mobile
          ? `flex min-w-fit items-center gap-2 whitespace-nowrap border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${baseClasses}`
          : `touch-target flex items-center border-l-2 px-4 py-3 transition-colors ${baseClasses}`;
      }}
    >
      <div className={`${mobile ? "flex h-8 w-8 items-center justify-center" : "touch-target-icon"} opacity-70`}>
        {icon}
      </div>
      <span className={mobile ? "pr-1" : "ml-2 hidden text-[11px] font-mono uppercase tracking-[0.15em] md:block"}>
        {label}
      </span>
    </NavLink>
  );
}
