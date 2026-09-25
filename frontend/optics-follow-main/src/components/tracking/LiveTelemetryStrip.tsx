import type { TrackingUpdate } from "@/types/tracking";
import type { SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";
import { fmt, fmtSigned } from "@/utils/format";
import { Activity, Cpu, Gauge, Navigation, ShieldCheck, Zap } from "lucide-react";

interface LiveTelemetryStripProps {
  update: TrackingUpdate | null;
  status: SimulationStatus;
  className?: string;
}

export function LiveTelemetryStrip({
  update,
  status,
  className,
}: LiveTelemetryStripProps) {
  const errorMag = update?.error?.magnitude ?? null;
  const isCoarseLocked = errorMag !== null && errorMag <= 24.0;
  const isTracking = status === "TRACKING";
  const isTargetLost = status === "TARGET_LOST";
  const isReAcquiring = status === "RE-ACQUIRING";

  const aiConf = update?.ai_confidence ?? update?.confidence ?? 0;
  const detectorMode = update?.detector_mode ?? "AI";
  const fps = update?.performance?.fps ?? 0;
  const aiLatency = update?.ai_inference_ms ?? null;
  const pan = update?.camera?.pan ?? 0;
  const tilt = update?.camera?.tilt ?? 0;
  const cmdPan = update?.camera?.commanded_pan_deg_s ?? 0;
  const cmdTilt = update?.camera?.commanded_tilt_deg_s ?? 0;

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2 rounded-lg border border-border bg-card/75 backdrop-blur-sm shadow-sm",
        className
      )}
    >
      {/* 1. TRACKING STATE */}
      <div className="flex flex-col justify-between p-2.5 rounded-md border border-border/70 bg-background/60">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <Activity className="size-3 text-primary" /> STATE
          </span>
          <span
            className={cn(
              "size-2 rounded-full",
              isTracking
                ? "bg-emerald-400 animate-pulse"
                : isTargetLost
                ? "bg-red-500 animate-ping"
                : isReAcquiring
                ? "bg-amber-400 animate-pulse"
                : "bg-muted-foreground"
            )}
          />
        </div>
        <div className="mt-1.5">
          <div
            className={cn(
              "text-base font-mono font-bold tracking-tight truncate",
              isTracking
                ? "text-emerald-400"
                : isTargetLost
                ? "text-red-400"
                : isReAcquiring
                ? "text-amber-400"
                : "text-foreground"
            )}
          >
            {status}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {update?.target_detected ? "BEACON IN FOV" : "BEACON SEARCH"}
          </div>
        </div>
      </div>

      {/* 2. TRACKING ERROR */}
      <div className="flex flex-col justify-between p-2.5 rounded-md border border-border/70 bg-background/60">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <Gauge className="size-3 text-sky-400" /> ERROR |e|
          </span>
          {isCoarseLocked && (
            <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-1 rounded">
              LOCK
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-base font-mono font-bold leading-none",
                errorMag === null
                  ? "text-muted-foreground"
                  : isCoarseLocked
                  ? "text-emerald-400"
                  : "text-amber-400"
              )}
            >
              {errorMag !== null ? `${errorMag.toFixed(1)} px` : "—"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {isCoarseLocked ? "COARSE LOCK (<24px)" : "OUTSIDE LOCK"}
          </div>
        </div>
      </div>

      {/* 3. AI CONFIDENCE */}
      <div className="flex flex-col justify-between p-2.5 rounded-md border border-border/70 bg-background/60">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <ShieldCheck className="size-3 text-emerald-400" /> CONFIDENCE
          </span>
          <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-1 rounded">
            {detectorMode}
          </span>
        </div>
        <div className="mt-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-mono font-bold text-foreground leading-none">
              {(aiConf * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {aiLatency !== null ? `${aiLatency.toFixed(1)} ms LATENCY` : "AI INFERENCE"}
          </div>
        </div>
      </div>

      {/* 4. STREAM FPS */}
      <div className="flex flex-col justify-between p-2.5 rounded-md border border-border/70 bg-background/60">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <Zap className="size-3 text-cyan-400" /> FPS
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">/ 30 Hz</span>
        </div>
        <div className="mt-1.5">
          <div className="text-base font-mono font-bold text-cyan-400 leading-none">
            {fps > 0 ? fmt(fps, 1) : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            FRAME #{update?.frame_id ?? 0}
          </div>
        </div>
      </div>

      {/* 5. GIMBAL PAN */}
      <div className="flex flex-col justify-between p-2.5 rounded-md border border-border/70 bg-background/60">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <Navigation className="size-3 text-sky-400" /> PAN
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">±45°</span>
        </div>
        <div className="mt-1.5">
          <div className="text-base font-mono font-bold text-foreground leading-none">
            {fmtSigned(pan, 2)}°
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {fmtSigned(cmdPan, 1)}°/s
          </div>
        </div>
      </div>

      {/* 6. GIMBAL TILT */}
      <div className="flex flex-col justify-between p-2.5 rounded-md border border-border/70 bg-background/60">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <Navigation className="size-3 text-amber-400 rotate-90" /> TILT
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">±45°</span>
        </div>
        <div className="mt-1.5">
          <div className="text-base font-mono font-bold text-foreground leading-none">
            {fmtSigned(tilt, 2)}°
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {fmtSigned(cmdTilt, 1)}°/s
          </div>
        </div>
      </div>
    </div>
  );
}
