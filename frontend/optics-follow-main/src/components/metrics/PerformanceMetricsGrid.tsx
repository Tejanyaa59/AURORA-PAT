import type { PerformanceSnapshot } from "@/types/tracking";
import type { PerformanceMetrics } from "@/types/metrics";
import { fmt, fmtPercent, fmtSeconds } from "@/utils/format";
import { MetricCard } from "./MetricCard";
import { cn } from "@/lib/utils";

interface Props {
  metrics: PerformanceSnapshot | PerformanceMetrics | null | undefined;
  detectionConfidence?: number | null | undefined;
  className?: string | undefined;
  columns?: string | undefined;
}

export function PerformanceMetricsGrid({
  metrics,
  detectionConfidence,
  className,
  columns,
}: Props) {
  const m = metrics ?? {};
  const loss = m.target_loss_percentage;
  const conf = m.detection_confidence ?? detectionConfidence ?? undefined;
  return (
    <div
      className={cn(
        "grid gap-3",
        columns ?? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      <MetricCard label="FPS" value={fmt(m.fps, 1)} />
      <MetricCard label="Acquisition" value={fmtSeconds(m.acquisition_time)} />
      <MetricCard label="Avg error" value={fmt(m.average_error, 1)} unit="px" />
      <MetricCard label="Max error" value={fmt(m.maximum_error, 1)} unit="px" />
      <MetricCard label="RMS error" value={fmt(m.rms_error, 1)} unit="px" />
      <MetricCard
        label="Target loss"
        value={fmtPercent(loss)}
        tone={
          loss === undefined ? "neutral" : loss > 10 ? "danger" : loss > 3 ? "warning" : "success"
        }
      />
      <MetricCard label="Reacquisition" value={fmtSeconds(m.reacquisition_time)} />
      <MetricCard label="Tracking success" value={fmtPercent(m.tracking_success_percentage)} />
      <MetricCard label="Detection conf." value={fmtPercent(conf)} />
    </div>
  );
}
