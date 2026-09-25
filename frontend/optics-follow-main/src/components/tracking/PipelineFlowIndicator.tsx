import type { SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  Camera,
  Compass,
  Cpu,
  Crosshair,
  Gauge,
  Radio,
} from "lucide-react";

interface PipelineFlowIndicatorProps {
  status: SimulationStatus;
  detected?: boolean | undefined;
  detectorMode?: string | undefined;
  errorMag?: number | null | undefined;
  fps?: number | undefined;
  className?: string | undefined;
}

export function PipelineFlowIndicator({
  status,
  detected = false,
  detectorMode = "AI",
  errorMag = null,
  fps = 0,
  className,
}: PipelineFlowIndicatorProps) {
  const isRunning = status !== "IDLE" && status !== "STOPPED";
  const isLocked = errorMag !== null && errorMag <= 24.0;
  const isLost = status === "TARGET_LOST";

  const stages = [
    {
      id: "target",
      name: "Optical Beacon",
      detail: isRunning ? "Mobile Source" : "Standby",
      icon: Radio,
      active: isRunning,
      tone: isRunning ? "text-emerald-400" : "text-muted-foreground",
    },
    {
      id: "sensor",
      name: "Camera Sensor",
      detail: isRunning ? `${fps > 0 ? fps.toFixed(0) : "30"} FPS (640×480)` : "Standby",
      icon: Camera,
      active: isRunning,
      tone: isRunning ? "text-sky-400" : "text-muted-foreground",
    },
    {
      id: "detector",
      name: "Beacon Detector",
      detail: isRunning
        ? detected
          ? `${detectorMode} Detected`
          : isLost
          ? "Target Lost"
          : "Searching"
        : "Standby",
      icon: Cpu,
      active: isRunning && detected,
      tone: isRunning
        ? detected
          ? "text-emerald-400"
          : isLost
          ? "text-red-400"
          : "text-amber-400"
        : "text-muted-foreground",
    },
    {
      id: "kalman",
      name: "Kalman Filter",
      detail: isRunning
        ? detected
          ? "State Estimated"
          : isLost
          ? "Coast Prediction"
          : "Initializing"
        : "Standby",
      icon: Crosshair,
      active: isRunning,
      tone: isRunning
        ? detected
          ? "text-fuchsia-400"
          : isLost
          ? "text-amber-400"
          : "text-muted-foreground"
        : "text-muted-foreground",
    },
    {
      id: "pid",
      name: "PID Controller",
      detail: errorMag !== null ? `${errorMag.toFixed(1)} px Error` : "Standby",
      icon: Gauge,
      active: isRunning && errorMag !== null,
      tone: isRunning
        ? isLocked
          ? "text-emerald-400"
          : "text-amber-400"
        : "text-muted-foreground",
    },
    {
      id: "gimbal",
      name: "Gimbal Actuator",
      detail: isRunning ? (isLocked ? "Coarse Lock" : "Slewing") : "Standby",
      icon: Compass,
      active: isRunning,
      tone: isRunning
        ? isLocked
          ? "text-emerald-400"
          : "text-sky-400"
        : "text-muted-foreground",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/60 p-3 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/50 text-[11px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Activity className="size-3.5 text-primary" /> CLOSED-LOOP PAT PIPELINE
        </span>
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "size-2 rounded-full",
              isRunning ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
            )}
          />
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-2.5">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="relative flex flex-col justify-between p-2 rounded border border-border/60 bg-background/50">
              <div className="flex items-center justify-between text-muted-foreground">
                <Icon className={cn("size-3.5", stage.tone)} />
                <span className="text-[10px] font-mono">0{idx + 1}</span>
              </div>
              <div className="mt-1.5 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {stage.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {stage.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
