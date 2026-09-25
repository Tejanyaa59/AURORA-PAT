import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Crosshair,
  FileText,
  Play,
  Server,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";
import { CameraViewport } from "@/components/camera/CameraViewport";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";
import { cn } from "@/lib/utils";
import { fmt } from "@/utils/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AURORA-PAT" },
      {
        name: "description",
        content:
          "AURORA-PAT — Free-Space Optical Terminal Coarse Alignment Console. Virtual simulation and real-time monitoring for coarse optical alignment.",
      },
      { property: "og:title", content: "Dashboard — AURORA-PAT" },
      {
        property: "og:description",
        content:
          "Virtual simulation and real-time monitoring for coarse optical alignment.",
      },
    ],
  }),
  component: Dashboard,
});

const EXPLORE_ITEMS = [
  {
    to: "/tracking",
    icon: Activity,
    title: "Real-Time Tracking",
    description: "Live camera sensor feed, world FOV alignment, and closed-loop telemetry.",
  },
  {
    to: "/simulation",
    icon: SlidersHorizontal,
    title: "Simulation Scenarios",
    description: "7 operational scenarios including high jitter, low visibility, and target loss.",
  },
  {
    to: "/analytics",
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Empirical error time-series, framerate stability, and scenario comparisons.",
  },
  {
    to: "/reports",
    icon: FileText,
    title: "Performance Reports",
    description: "Formal alignment verification report with print and PDF export.",
  },
];

function Dashboard() {
  const { stream, backend, simulation, simulationStatus, configState } = useAppState();
  const latest = stream.latest;
  const navigate = useNavigate();

  const isDetected = Boolean(latest?.target_detected);
  const errorMag = latest?.error?.magnitude ?? null;
  const conf = latest?.ai_confidence ?? latest?.confidence ?? (isDetected ? 0.95 : 0);
  const fps = latest?.performance?.fps ?? 30.0;

  const handleStartLiveDemo = async () => {
    try {
      if (simulationStatus === "IDLE" || simulationStatus === "STOPPED") {
        await simulation.runAction("start");
      }
    } catch {
      // ignore network errors and proceed
    }
    void navigate({ to: "/tracking" });
  };

  return (
    <div className="space-y-4">
      {/* 1. HERO / HEADER */}
      <div className="rounded-xl border border-border bg-card/80 p-5 md:p-6 backdrop-blur-sm shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono font-semibold uppercase tracking-wider mb-2.5">
              <Crosshair className="size-3.5" /> Optical Tracking Console
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-mono">
              AURORA-PAT
            </h1>
            <p className="text-sm md:text-base font-medium text-foreground/90 mt-1">
              Free-Space Optical Terminal Coarse Alignment Console
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-2 leading-relaxed">
              Virtual simulation and real-time monitoring for coarse optical alignment.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <Button
              size="lg"
              onClick={handleStartLiveDemo}
              className="bg-primary text-primary-foreground font-semibold px-6 py-2.5 text-sm gap-2 shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Play className="size-4 fill-current" /> START LIVE DEMO <ArrowRight className="size-4" />
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono">
              Start the demo to open Real-Time Tracking
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          Open Real-Time Tracking to view the live camera, target position, alignment state and tracking performance.
        </div>
      </div>

      {/* 2. SYSTEM STATUS & CURRENT PERFORMANCE (COMPACT) */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* System Status */}
        <div className="rounded-lg border border-border bg-card/60 p-3.5 backdrop-blur-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-muted-foreground pb-2 border-b border-border/50 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="size-3.5 text-primary" /> System Status
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">Operational Health</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2.5 font-mono text-xs">
            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Backend</span>
              <span
                className={cn(
                  "font-bold text-xs mt-1 block truncate",
                  backend.status === "CONNECTED" ? "text-emerald-400" : "text-destructive"
                )}
              >
                {backend.status === "CONNECTED" ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>

            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Live Stream</span>
              <span
                className={cn(
                  "font-bold text-xs mt-1 block truncate",
                  stream.wsStatus === "CONNECTED" ? "text-emerald-400" : "text-amber-400"
                )}
              >
                {stream.wsStatus === "CONNECTED" ? "CONNECTED" : "STANDBY"}
              </span>
            </div>

            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Simulation</span>
              <span
                className={cn(
                  "font-bold text-xs mt-1 block truncate",
                  simulationStatus === "TRACKING"
                    ? "text-emerald-400"
                    : simulationStatus === "TARGET_LOST"
                    ? "text-destructive"
                    : "text-sky-400"
                )}
              >
                {simulationStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Current Performance */}
        <div className="rounded-lg border border-border bg-card/60 p-3.5 backdrop-blur-sm">
          <div className="text-[11px] font-mono uppercase font-bold text-muted-foreground pb-2 border-b border-border/50 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" /> Current Performance
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">Active Alignment</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2.5 font-mono text-xs">
            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">FPS</span>
              <span className="font-bold text-xs text-sky-400 mt-1 block truncate">
                {fmt(fps, 1)}
              </span>
            </div>

            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Avg Error</span>
              <span
                className={cn(
                  "font-bold text-xs mt-1 block truncate",
                  errorMag === null
                    ? "text-muted-foreground"
                    : errorMag <= 24
                    ? "text-emerald-400"
                    : "text-amber-400"
                )}
              >
                {errorMag !== null ? `${errorMag.toFixed(1)} px` : "—"}
              </span>
            </div>

            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">State</span>
              <span className="font-bold text-xs text-foreground mt-1 block truncate">
                {simulationStatus}
              </span>
            </div>

            <div className="p-2 rounded border border-border/60 bg-background/50">
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">AI Conf</span>
              <span className="font-bold text-xs text-emerald-400 mt-1 block truncate">
                {(conf * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIVE PREVIEW & EXPLORE NAVIGATION */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Left: Live Camera Preview (7 cols) */}
        <div className="lg:col-span-7">
          <Panel
            title="Live Sensor Preview"
            subtitle="Camera frame preview with boresight alignment and optical beacon tracking"
            bodyClassName="p-3"
            actions={
              <Button asChild variant="outline" size="sm" className="h-7 text-xs font-mono">
                <Link to="/tracking">
                  Open Tracking <ArrowRight className="size-3 ml-1" />
                </Link>
              </Button>
            }
          >
            <CameraViewport
              update={latest}
              backendStatus={backend.status}
              streamConnected={stream.wsStatus === "CONNECTED"}
              simulationStatus={simulationStatus}
              fallbackWidth={configState.config.camera.width}
              fallbackHeight={configState.config.camera.height}
            />
          </Panel>
        </div>

        {/* Right: Explore Navigation (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="text-[11px] font-mono uppercase font-bold text-muted-foreground px-1">
            Console Sections
          </div>

          <div className="grid gap-2.5 flex-1">
            {EXPLORE_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/60 hover:bg-card hover:border-primary/50 transition-all group"
              >
                <div className="size-8 rounded-md bg-primary/10 border border-primary/20 grid place-items-center shrink-0 mt-0.5 group-hover:bg-primary/20 group-hover:border-primary/40 transition-colors">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
