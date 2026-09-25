import type { Target, TrackingUpdate } from "@/types/tracking";
import { EmptyState, Panel } from "@/components/layout/Panel";
import { cn } from "@/lib/utils";
import { fmt, fmtPercent } from "@/utils/format";

interface Props {
  update: TrackingUpdate | null;
  className?: string;
}

function targetsOf(update: TrackingUpdate): Target[] {
  if (update.targets && update.targets.length > 0) return update.targets;
  return update.target ? [update.target] : [];
}

export function TargetInfoPanel({ update, className }: Props) {
  const targets = update ? targetsOf(update) : [];
  const designatedId =
    update?.designated_target_id ??
    targets.find((t) => t.designated)?.id ??
    update?.target?.id ??
    null;

  return (
    <Panel
      title="Target data"
      subtitle="Detected and predicted positions"
      className={className}
      actions={
        update ? (
          <div className="flex items-center gap-2">
            {update.detector_mode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {update.detector_mode}
                {update.ai_inference_ms !== undefined && update.ai_inference_ms !== null && ` (${update.ai_inference_ms.toFixed(1)}ms)`}
              </span>
            )}
            <span
              className={cn("label-tech", update.target_detected ? "text-success" : "text-danger")}
            >
              {update.target_detected ? "Detected" : "Not detected"}
            </span>
          </div>
        ) : null
      }
    >
      {targets.length === 0 ? (
        <EmptyState message={update ? "Target not detected" : "No target data received"} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="label-tech text-[10px] text-left">
                <th className="py-1.5 pr-2 font-medium">ID</th>
                <th className="py-1.5 pr-2 font-medium">X</th>
                <th className="py-1.5 pr-2 font-medium">Y</th>
                <th className="py-1.5 pr-2 font-medium">Pred X</th>
                <th className="py-1.5 pr-2 font-medium">Pred Y</th>
                <th className="py-1.5 pr-2 font-medium">Conf</th>
                <th className="py-1.5 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="numeric">
              {targets.map((t) => {
                const isDesignated = t.id === designatedId;
                return (
                  <tr
                    key={t.id}
                    className={cn("border-t border-border/60", isDesignated && "bg-success/5")}
                  >
                    <td className="py-1.5 pr-2">T{t.id}</td>
                    <td className="py-1.5 pr-2">{fmt(t.x, 0)}</td>
                    <td className="py-1.5 pr-2">{fmt(t.y, 0)}</td>
                    <td className="py-1.5 pr-2 text-predicted">{fmt(t.predicted_x, 0)}</td>
                    <td className="py-1.5 pr-2 text-predicted">{fmt(t.predicted_y, 0)}</td>
                    <td className="py-1.5 pr-2">
                      {fmtPercent(t.confidence ?? (isDesignated ? update?.confidence : undefined))}
                    </td>
                    <td className="py-1.5 font-sans">
                      {isDesignated ? (
                        <span className="text-success label-tech text-[10px]">Designated</span>
                      ) : (
                        <span className="text-muted-foreground label-tech text-[10px]">
                          Secondary
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
