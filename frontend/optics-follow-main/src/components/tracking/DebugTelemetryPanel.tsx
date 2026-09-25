import { useState } from "react";
import { ChevronDown, ChevronUp, Terminal, Copy, Check } from "lucide-react";
import type { TrackingUpdate } from "@/types/tracking";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";

interface DebugTelemetryPanelProps {
  update: TrackingUpdate | null;
}

export function DebugTelemetryPanel({ update }: DebugTelemetryPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!update) return;
    void navigator.clipboard.writeText(JSON.stringify(update, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fields = update
    ? [
        { key: "frame_id", val: update.frame_id },
        { key: "timestamp", val: update.timestamp },
        { key: "status", val: update.status },
        { key: "target_detected", val: String(update.target_detected) },
        { key: "detector_mode", val: update.detector_mode ?? "AI" },
        { key: "ai_confidence", val: update.ai_confidence ?? update.confidence ?? "—" },
        { key: "ai_inference_ms", val: update.ai_inference_ms ?? "—" },
        { key: "target_pos (x, y)", val: update.target ? `(${update.target.x.toFixed(2)}, ${update.target.y.toFixed(2)})` : "None" },
        { key: "predicted_pos (x, y)", val: update.target?.predicted_x !== undefined ? `(${update.target.predicted_x.toFixed(2)}, ${update.target.predicted_y?.toFixed(2)})` : "None" },
        { key: "kalman_state", val: update.target?.kalman_state ?? update.kalman_state ?? "—" },
        { key: "velocity (vx, vy)", val: update.target?.velocity_x !== undefined ? `(${update.target.velocity_x.toFixed(2)}, ${update.target.velocity_y?.toFixed(2)}) px/s` : "—" },
        { key: "error_x_px", val: update.error?.x ?? update.error_x_px ?? 0 },
        { key: "error_y_px", val: update.error?.y ?? update.error_y_px ?? 0 },
        { key: "error_magnitude_px", val: update.error?.magnitude ?? 0 },
        { key: "commanded_pan_deg_s", val: update.camera?.commanded_pan_deg_s ?? update.commanded_pan_deg_s ?? 0 },
        { key: "commanded_tilt_deg_s", val: update.camera?.commanded_tilt_deg_s ?? update.commanded_tilt_deg_s ?? 0 },
        { key: "actual_pan_deg", val: update.camera?.actual_pan_deg ?? update.actual_pan_deg ?? update.camera?.pan ?? 0 },
        { key: "actual_tilt_deg", val: update.camera?.actual_tilt_deg ?? update.actual_tilt_deg ?? update.camera?.tilt ?? 0 },
        { key: "pan_limits", val: `[${update.camera?.min_pan_deg ?? -45}°, +${update.camera?.max_pan_deg ?? 45}°]` },
        { key: "tilt_limits", val: `[${update.camera?.min_tilt_deg ?? -45}°, +${update.camera?.max_tilt_deg ?? 45}°]` },
        { key: "target_count", val: update.targets?.length ?? (update.target ? 1 : 0) },
        { key: "fps", val: update.performance?.fps ?? "—" },
        { key: "tracking_success_%", val: update.performance?.tracking_success_percentage ?? "—" },
      ]
    : [];

  return (
    <Panel
      title="Raw Telemetry Inspector"
      subtitle="Exposes direct low-level packet fields streamed from backend WebSocket"
      actions={
        <div className="flex items-center gap-1.5">
          {update && (
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs h-7 gap-1">
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(!open)}
            className="text-xs h-7 gap-1"
          >
            <Terminal className="size-3" />
            {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {open ? "Hide Raw Data" : "Inspect Raw Fields"}
          </Button>
        </div>
      }
    >
      {open ? (
        <div className="overflow-x-auto rounded border border-border/80 bg-muted/30 p-2 font-mono text-[11px] animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center justify-between p-1.5 rounded bg-background/60 border border-border/40">
                <span className="text-muted-foreground truncate">{f.key}:</span>
                <span className="font-bold text-foreground truncate ml-2">{String(f.val)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Telemetry streaming active. Click <span className="font-medium text-foreground">Inspect Raw Fields</span> to monitor all 23 real-time state variables.
        </p>
      )}
    </Panel>
  );
}
