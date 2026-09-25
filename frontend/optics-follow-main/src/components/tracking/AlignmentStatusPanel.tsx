import type { TrackingUpdate } from "@/types/tracking";
import type { SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";
import { fmt, fmtSigned } from "@/utils/format";
import { Crosshair } from "lucide-react";

interface AlignmentStatusPanelProps {
  update: TrackingUpdate | null;
  status: SimulationStatus;
  className?: string;
}

export function AlignmentStatusPanel({ update, status, className }: AlignmentStatusPanelProps) {
  const isDetected = Boolean(update?.target_detected);
  const errorMag = update?.error?.magnitude ?? null;
  const isCoarseLocked = errorMag !== null && errorMag <= 24.0;

  const conf = update?.ai_confidence ?? update?.confidence ?? (isDetected ? 0.95 : 0);
  const fps = update?.performance?.fps ?? 30.0;
  const pan = update?.camera?.pan ?? 0;
  const tilt = update?.camera?.tilt ?? 0;

  // Format operational tracking status
  let displayStatus: string = status;
  if (status === "IDLE" || status === "STOPPED") {
    displayStatus = status;
  } else if (!isDetected) {
    displayStatus = "TARGET LOST";
  } else if (status === "ACQUIRING" || status === "RE-ACQUIRING") {
    displayStatus = status;
  } else {
    displayStatus = "TRACKING";
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card/80 p-3 backdrop-blur-sm shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/50 text-[11px] font-mono">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-foreground">
          <Crosshair className="size-3.5 text-primary" /> ALIGNMENT STATUS
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border",
              isCoarseLocked
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                : "bg-amber-500/15 text-amber-400 border-amber-500/40"
            )}
          >
            {isCoarseLocked ? "LOCKED (<24px)" : "ALIGNING"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            OPERATIONAL MODE: <strong className="text-foreground">{displayStatus}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-2.5 text-xs font-mono">
        {/* 1. Target */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Target</div>
          <div className="font-bold text-foreground truncate mt-0.5 text-sm">
            DESIGNATED #1
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {isDetected ? "In Track Gate" : "Searching"}
          </div>
        </div>

        {/* 2. Status */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Status</div>
          <div
            className={cn(
              "font-bold truncate mt-0.5 text-sm",
              displayStatus === "TRACKING"
                ? "text-emerald-400"
                : displayStatus === "TARGET LOST"
                ? "text-destructive"
                : "text-amber-400"
            )}
          >
            {displayStatus}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Closed-Loop
          </div>
        </div>

        {/* 3. Error */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Error</div>
          <div
            className={cn(
              "font-bold truncate mt-0.5 text-sm",
              errorMag === null
                ? "text-muted-foreground"
                : isCoarseLocked
                ? "text-emerald-400"
                : "text-amber-400"
            )}
          >
            {errorMag !== null ? `${errorMag.toFixed(1)} px` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {update?.error ? `ΔX:${fmtSigned(update.error.x, 0)} ΔY:${fmtSigned(update.error.y, 0)}` : "—"}
          </div>
        </div>

        {/* 4. Coarse Alignment */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Coarse Lock</div>
          <div
            className={cn(
              "font-bold truncate mt-0.5 text-sm",
              isCoarseLocked ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {isCoarseLocked ? "LOCKED" : "ALIGNING"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Threshold 24 px
          </div>
        </div>

        {/* 5. Confidence */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Confidence</div>
          <div className="font-bold text-emerald-400 truncate mt-0.5 text-sm">
            {(conf * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Detection Prob
          </div>
        </div>

        {/* 6. FPS */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">FPS</div>
          <div className="font-bold text-sky-400 truncate mt-0.5 text-sm">
            {fmt(fps, 1)}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Live Rate
          </div>
        </div>

        {/* 7. Pan */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Pan</div>
          <div className="font-bold text-foreground truncate mt-0.5 text-sm">
            {fmtSigned(pan, 1)}°
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Azimuth Angle
          </div>
        </div>

        {/* 8. Tilt */}
        <div className="p-2 rounded border border-border/60 bg-background/50">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Tilt</div>
          <div className="font-bold text-foreground truncate mt-0.5 text-sm">
            {fmtSigned(tilt, 1)}°
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Elevation Angle
          </div>
        </div>
      </div>
    </div>
  );
}
