import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, CheckCircle2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "Simulation Scenarios — AURORA-PAT" },
      {
        name: "description",
        content:
          "Predefined operational scenarios and real-time tracking simulation for AURORA-PAT coarse alignment console.",
      },
      { property: "og:title", content: "Simulation Scenarios — AURORA-PAT" },
      {
        property: "og:description",
        content: "Operational scenarios and tracking simulation controls.",
      },
    ],
  }),
  component: SimulationPage,
});

const SCENARIOS = [
  {
    id: "scenario_1",
    number: "1",
    name: "NORMAL TRACKING",
    desc: "Baseline alignment",
    details: "Nominal mobile optical beacon tracking with baseline alignment dynamics.",
    fps: 28.0,
    avgError: "18.0 px",
    successRate: "89.6%",
    lossRate: "0.0%",
    reacqTime: "0.00 s",
  },
  {
    id: "scenario_2",
    number: "2",
    name: "FAST TARGET",
    desc: "High-speed target motion",
    details: "High-velocity tactical aerial target (130 px/s) testing gimbal slew acceleration limits.",
    fps: 29.3,
    avgError: "17.1 px",
    successRate: "86.1%",
    lossRate: "0.0%",
    reacqTime: "0.00 s",
  },
  {
    id: "scenario_3",
    number: "3",
    name: "HIGH CAMERA JITTER",
    desc: "Vibration disturbance",
    details: "Mechanical mount vibration and platform angular sway deflection.",
    fps: 29.8,
    avgError: "24.1 px",
    successRate: "85.1%",
    lossRate: "0.0%",
    reacqTime: "0.00 s",
  },
  {
    id: "scenario_4",
    number: "4",
    name: "LOW VISIBILITY",
    desc: "Reduced optical visibility",
    details: "Atmospheric haze aerosol scattering and reduced low-light contrast channel.",
    fps: 14.6,
    avgError: "17.4 px",
    successRate: "92.0%",
    lossRate: "0.0%",
    reacqTime: "0.00 s",
  },
  {
    id: "scenario_5",
    number: "5",
    name: "NOISE + BLUR",
    desc: "Sensor degradation",
    details: "Sensor read noise, bad pixel impulse degradation, and optical motion blur.",
    fps: 11.7,
    avgError: "21.9 px",
    successRate: "90.2%",
    lossRate: "0.0%",
    reacqTime: "0.00 s",
  },
  {
    id: "scenario_6",
    number: "6",
    name: "TARGET LOSS",
    desc: "Temporary target disappearance and recovery",
    details: "Temporary beam obscuration demonstrating automatic recovery and reacquisition.",
    fps: 20.3,
    avgError: "14.0 px",
    successRate: "83.0%",
    lossRate: "13.0%",
    reacqTime: "2.05 s",
  },
  {
    id: "scenario_7",
    number: "7",
    name: "MULTIPLE TARGETS",
    desc: "Target identification in clutter",
    details: "Multi-terminal formation with 4 optical beacons maintaining lock on designated beacon.",
    fps: 22.6,
    avgError: "31.0 px",
    successRate: "60.2%",
    lossRate: "0.0%",
    reacqTime: "0.00 s",
  },
];

function SimulationPage() {
  const { simulation, simulationStatus, backend } = useAppState();
  const [activeScenarioId, setActiveScenarioId] = useState<string>("scenario_1");

  const handleRun = async (scenId: string) => {
    setActiveScenarioId(scenId);
    try {
      await fetch(`/api/simulation/scenario/${scenId}`, { method: "POST" });
      await simulation.runAction("reset");
      await simulation.runAction("start");
    } catch {
      await simulation.runAction("start");
    }
  };

  const handlePause = async () => {
    await simulation.runAction("pause");
  };

  const handleReset = async () => {
    await simulation.runAction("reset");
  };

  const isRunning = simulationStatus !== "IDLE" && simulationStatus !== "STOPPED";

  return (
    <>
      <PageHeader
        title="Simulation Scenarios"
        description="Select and execute predefined operational tracking scenarios with real-time alignment control."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5 font-semibold">
            <Link to="/tracking">
              <Activity className="size-4" /> Watch Live in Tracking Console <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {/* Global State & Run Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/70 backdrop-blur-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono">
            <span className="text-muted-foreground mr-1.5">SIMULATION STATE:</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded font-bold border",
                isRunning
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {simulationStatus}
            </span>
          </div>
          <div className="text-xs font-mono text-muted-foreground hidden sm:inline">
            Active: <strong className="text-foreground">{SCENARIOS.find((s) => s.id === activeScenarioId)?.name}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => void handleRun(activeScenarioId)}
            className="h-8 text-xs gap-1 font-semibold"
          >
            <Play className="size-3.5" /> Run Active
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handlePause()}
            disabled={!isRunning}
            className="h-8 text-xs gap-1"
          >
            <Pause className="size-3.5" /> Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleReset()}
            className="h-8 text-xs gap-1"
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void simulation.runAction("stop")}
            disabled={!isRunning}
            className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10"
          >
            <Square className="size-3.5" /> Stop
          </Button>
        </div>
      </div>

      {/* 7 Operational Scenario Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map((scen) => {
          const isActive = activeScenarioId === scen.id;
          const isActivelyExecuting = isActive && isRunning;

          return (
            <div
              key={scen.id}
              className={cn(
                "flex flex-col justify-between p-4 rounded-xl border transition-all font-mono text-xs bg-card/60 backdrop-blur-sm",
                isActive
                  ? "border-primary/60 ring-1 ring-primary/40 shadow-sm"
                  : "border-border hover:border-border/80"
              )}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                      <span className="text-primary font-bold">{scen.number}.</span>
                      <span>{scen.name}</span>
                    </div>
                    <div className="text-[11px] font-sans font-medium text-primary mt-0.5">
                      {scen.desc}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold border shrink-0",
                      isActivelyExecuting
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                        : isActive
                        ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                        : "bg-muted/40 text-muted-foreground border-border/50"
                    )}
                  >
                    {isActivelyExecuting ? "EXECUTING" : isActive ? "SELECTED" : "STANDBY"}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] font-sans text-muted-foreground mt-2.5 leading-relaxed">
                  {scen.details}
                </p>

                {/* Key Measured Results */}
                <div className="mt-3.5 pt-3 border-t border-border/50">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">
                    Key Measured Results
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">THROUGHPUT</span>
                      <span className="font-bold text-sky-400">{scen.fps} FPS</span>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">AVG ERROR</span>
                      <span className="font-bold text-emerald-400">{scen.avgError}</span>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">LOCK RATE</span>
                      <span className="font-bold text-emerald-400">{scen.successRate}</span>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">TARGET LOSS</span>
                      <span className={cn("font-bold", scen.lossRate !== "0.0%" ? "text-amber-400" : "text-muted-foreground")}>
                        {scen.lossRate}
                      </span>
                    </div>
                    {scen.reacqTime !== "0.00 s" && (
                      <div className="col-span-2 p-2 rounded bg-background/50 border border-border/50">
                        <span className="text-[10px] text-muted-foreground block">REACQUISITION TIME</span>
                        <span className="font-bold text-sky-400">{scen.reacqTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Controls for this scenario */}
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => void handleRun(scen.id)}
                  className="flex-1 text-xs h-8 gap-1 font-semibold"
                >
                  <Play className="size-3.5" /> Run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handlePause()}
                  disabled={!isActivelyExecuting}
                  className="text-xs h-8 px-2.5"
                  title="Pause simulation"
                >
                  <Pause className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleReset()}
                  className="text-xs h-8 px-2.5"
                  title="Reset simulation"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
