import type { TrackingError } from "@/types/tracking";
import { Panel } from "@/components/layout/Panel";
import { fmt, fmtSigned } from "@/utils/format";
import { cn } from "@/lib/utils";

interface Props {
  error: TrackingError | null | undefined;
  detected: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function TrackingErrorPanel({ error, detected, className, children }: Props) {
  const mag = error?.magnitude ?? null;
  const tone =
    mag === null
      ? "text-muted-foreground"
      : mag < 5
        ? "text-success"
        : mag < 15
          ? "text-warning"
          : "text-danger";
  return (
    <Panel
      title="Tracking error"
      subtitle="Pixel offset between camera center and target"
      className={className}
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="label-tech">Error X</div>
          <div className="numeric text-xl text-error-x">{fmtSigned(error?.x, 0, " px")}</div>
        </div>
        <div>
          <div className="label-tech">Error Y</div>
          <div className="numeric text-xl text-error-y">{fmtSigned(error?.y, 0, " px")}</div>
        </div>
        <div>
          <div className="label-tech">Magnitude</div>
          <div className={cn("numeric text-xl", tone)}>{fmt(mag, 2, " px")}</div>
        </div>
      </div>
      {!detected && error === undefined && (
        <p className="mt-2 text-xs text-muted-foreground">
          Target not detected — no error available.
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </Panel>
  );
}
