import { Cpu, Eye, Activity } from "lucide-react";
import type { TrackingUpdate } from "@/types/tracking";
import type { PIDConfig } from "@/types/simulation";
import { Panel } from "@/components/layout/Panel";
import { cn } from "@/lib/utils";
import { fmt, fmtSigned } from "@/utils/format";

interface ControlLoopPanelProps {
  update: TrackingUpdate | null;
  pidConfig?: PIDConfig;
  className?: string;
}

export function ControlLoopPanel({ update, pidConfig, className }: ControlLoopPanelProps) {
  const target = update?.target;
  const isDetected = Boolean(update?.target_detected);

  const cmdPan = update?.camera?.commanded_pan_deg_s ?? update?.commanded_pan_deg_s ?? 0;
  const cmdTilt = update?.camera?.commanded_tilt_deg_s ?? update?.commanded_tilt_deg_s ?? 0;

  const kalmanState = target?.kalman_state ?? update?.kalman_state ?? (isDetected ? "UPDATED" : "COASTING");
  const velX = target?.velocity_x ?? update?.velocity_x ?? 0;
  const velY = target?.velocity_y ?? update?.velocity_y ?? 0;

  return (
    <Panel
      title="Closed-Loop Control Engine"
      subtitle="Real-time telemetry across AI beacon detection, 4D Kalman estimation, and dual-axis PID servo"
      className={className}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. AI Beacon Detector */}
        <div className="p-3 rounded-lg border border-border/80 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Eye className="size-4 text-emerald-400" />
              <span>AI BeaconCNN Detector</span>
            </div>
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase",
                isDetected ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-destructive/15 text-destructive border border-destructive/30"
              )}
            >
              {isDetected ? "DETECTED" : "NO BEACON"}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-mono font-medium text-emerald-400">{update?.detector_mode ?? "AI"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-mono font-bold text-foreground">
                {update ? `${fmt((update.target?.confidence ?? update.confidence ?? 0.95) * 100, 1)}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inference Latency:</span>
              <span className="font-mono text-sky-400">
                {update?.ai_inference_ms !== undefined && update?.ai_inference_ms !== null
                  ? `${update.ai_inference_ms.toFixed(1)} ms`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Kalman Filter State Estimation */}
        <div className="p-3 rounded-lg border border-border/80 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Activity className="size-4 text-purple-400" />
              <span>4D Kalman Filter</span>
            </div>
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase",
                kalmanState === "UPDATED"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              )}
            >
              {kalmanState}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Predicted (x, y):</span>
              <span className="font-mono text-foreground">
                {target?.predicted_x !== undefined && target?.predicted_y !== undefined
                  ? `(${target.predicted_x.toFixed(1)}, ${target.predicted_y.toFixed(1)})`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Velocity:</span>
              <span className="font-mono text-purple-300">
                {`(${fmtSigned(velX, 1)}, ${fmtSigned(velY, 1)}) px/s`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uncertainty (1σ):</span>
              <span className="font-mono text-muted-foreground">
                {target?.uncertainty ? `±${target.uncertainty.toFixed(1)} px` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Dual-Axis PID Controller */}
        <div className="p-3 rounded-lg border border-border/80 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Cpu className="size-4 text-sky-400" />
              <span>PID Servo Controller</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
              ACTIVE
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cmd Pan Slew:</span>
              <span className="font-mono font-bold text-sky-400">
                {`${fmtSigned(cmdPan, 2)} °/s`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cmd Tilt Slew:</span>
              <span className="font-mono font-bold text-sky-400">
                {`${fmtSigned(cmdTilt, 2)} °/s`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tuned Gains:</span>
              <span className="font-mono text-muted-foreground">
                {pidConfig
                  ? `Kp:${pidConfig.pan.kp} Ki:${pidConfig.pan.ki} Kd:${pidConfig.pan.kd}`
                  : "Kp:1.8 Ki:0.8 Kd:0.15"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
