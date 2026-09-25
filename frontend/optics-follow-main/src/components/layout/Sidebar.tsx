import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Camera,
  Crosshair,
  FileText,
  Film,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/tracking", label: "Real-Time Tracking", icon: Activity },
      { to: "/simulation", label: "Simulation", icon: SlidersHorizontal },
    ],
  },
  {
    group: "Evaluation",
    items: [
      { to: "/analytics", label: "Performance Analytics", icon: BarChart3 },
      { to: "/video", label: "Video Benchmarking", icon: Film },
      { to: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    group: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 h-14 border-b border-sidebar-border px-3",
          collapsed && "justify-center",
        )}
      >
        <div className="size-7 rounded-sm bg-primary/15 border border-primary/40 grid place-items-center shrink-0">
          <Crosshair className="size-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold tracking-tight truncate">AURORA-PAT</div>
            <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Alignment Console
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((group) => (
          <div key={group.group} className="mb-3">
            {!collapsed && <div className="px-4 pb-1 label-tech text-[10px]">{group.group}</div>}
            <ul className="px-2 space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                      collapsed && "justify-center px-0",
                    )}
                    activeOptions={{ exact: item.to === "/" }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3 text-[10px] text-muted-foreground leading-relaxed">
          Free-Space Optical Communications
          <br />
          Virtual Camera Coarse Alignment
        </div>
      )}
    </aside>
  );
}
