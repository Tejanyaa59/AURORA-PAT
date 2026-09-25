import type { CameraState } from "@/types/tracking";
import { Panel } from "@/components/layout/Panel";
import { fmt, fmtSigned } from "@/utils/format";

interface Props {
  camera: CameraState | null | undefined;
  /** Angular range shown by the gauge (± degrees). Display-only. */
  panRange?: number;
  tiltRange?: number;
  className?: string;
}

function clamp01(v: number) {
  return Math.max(-1, Math.min(1, v));
}

export function PanTiltIndicator({ camera, panRange = 90, tiltRange = 45, className }: Props) {
  const pan = camera?.pan ?? null;
  const tilt = camera?.tilt ?? null;
  const size = 200;
  const half = size / 2;
  const px = pan === null ? half : half + clamp01(pan / panRange) * (half - 16);
  const py = tilt === null ? half : half - clamp01(tilt / tiltRange) * (half - 16);

  return (
    <Panel title="Pan / Tilt" subtitle="Gimbal orientation & mechanical limits" className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto w-44 h-44 sm:w-48 sm:h-48"
          aria-label="Pan tilt orientation"
        >
          <rect
            x={0.5}
            y={0.5}
            width={size - 1}
            height={size - 1}
            fill="var(--color-viewport)"
            stroke="var(--color-border)"
            rx={4}
          />
          {/* grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <g key={f} stroke="var(--color-grid)" strokeWidth={1}>
              <line x1={size * f} y1={0} x2={size * f} y2={size} />
              <line x1={0} y1={size * f} x2={size} y2={size * f} />
            </g>
          ))}
          {/* axes */}
          <line
            x1={16}
            y1={half}
            x2={size - 16}
            y2={half}
            stroke="var(--color-muted-foreground)"
            strokeWidth={1}
          />
          <line
            x1={half}
            y1={16}
            x2={half}
            y2={size - 16}
            stroke="var(--color-muted-foreground)"
            strokeWidth={1}
          />
          {/* arrows */}
          <polygon
            points={`${size - 16},${half} ${size - 22},${half - 3} ${size - 22},${half + 3}`}
            fill="var(--color-muted-foreground)"
          />
          <polygon
            points={`16,${half} 22,${half - 3} 22,${half + 3}`}
            fill="var(--color-muted-foreground)"
          />
          <polygon
            points={`${half},16 ${half - 3},22 ${half + 3},22`}
            fill="var(--color-muted-foreground)"
          />
          <polygon
            points={`${half},${size - 16} ${half - 3},${size - 22} ${half + 3},${size - 22}`}
            fill="var(--color-muted-foreground)"
          />
          <text
            x={half}
            y={12}
            textAnchor="middle"
            fontSize={9}
            fill="var(--color-muted-foreground)"
            fontFamily="var(--font-mono)"
          >
            TILT +
          </text>
          <text
            x={size - 4}
            y={half - 6}
            textAnchor="end"
            fontSize={9}
            fill="var(--color-muted-foreground)"
            fontFamily="var(--font-mono)"
          >
            PAN +
          </text>
          {/* tracer line from origin */}
          {pan !== null && tilt !== null && (
            <line
              x1={half}
              y1={half}
              x2={px}
              y2={py}
              stroke="var(--color-primary)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}
          {/* orientation marker */}
          <circle
            cx={px}
            cy={py}
            r={6}
            fill={pan === null ? "var(--color-muted)" : "var(--color-primary)"}
            stroke="var(--color-background)"
            strokeWidth={2}
          />
        </svg>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label-tech">Pan</div>
            <div className="numeric text-2xl leading-tight">{fmtSigned(pan, 2, "°")}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              speed <span className="numeric">{fmt(camera?.pan_speed, 2, " °/s")}</span>
            </div>
          </div>
          <div>
            <div className="label-tech">Tilt</div>
            <div className="numeric text-2xl leading-tight">{fmtSigned(tilt, 2, "°")}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              speed <span className="numeric">{fmt(camera?.tilt_speed, 2, " °/s")}</span>
            </div>
          </div>
          {!camera && (
            <p className="col-span-2 text-xs text-muted-foreground">No pan/tilt data received.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}
