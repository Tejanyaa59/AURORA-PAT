import { useMemo } from "react";
import type { Target, TrackingUpdate } from "@/types/tracking";
import type { SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";
import { fmt, fmtSigned } from "@/utils/format";
import type { BackendStatus } from "@/utils/status";

interface CameraViewportProps {
  update: TrackingUpdate | null;
  backendStatus: BackendStatus;
  streamConnected: boolean;
  simulationStatus: SimulationStatus;
  /** Fallback frame size (from configuration) if the stream doesn't specify one. */
  fallbackWidth: number;
  fallbackHeight: number;
  showUncertainty?: boolean;
  className?: string;
}

function frameSrc(frame: string | null | undefined): string | null {
  if (!frame) return null;
  return frame.startsWith("data:") ? frame : `data:image/jpeg;base64,${frame}`;
}

function collectTargets(update: TrackingUpdate): {
  targets: Target[];
  designatedId: number | null;
} {
  const list: Target[] = [];
  if (update.targets && update.targets.length > 0) list.push(...update.targets);
  else if (update.target) list.push(update.target);
  const designatedId =
    update.designated_target_id ??
    list.find((t) => t.designated)?.id ??
    update.target?.id ??
    list[0]?.id ??
    null;
  return { targets: list, designatedId };
}

export function CameraViewport({
  update,
  backendStatus,
  streamConnected,
  simulationStatus,
  fallbackWidth,
  fallbackHeight,
  showUncertainty = true,
  className,
}: CameraViewportProps) {
  const width = update?.frame_info?.width ?? fallbackWidth;
  const height = update?.frame_info?.height ?? fallbackHeight;
  const src = frameSrc(update?.frame);
  const center = update?.camera_center ?? { x: width / 2, y: height / 2 };
  const { targets, designatedId } = useMemo(
    () => (update ? collectTargets(update) : { targets: [], designatedId: null }),
    [update],
  );
  const designated = targets.find((t) => t.id === designatedId) ?? null;

  const simActive = !["IDLE", "STOPPED"].includes(simulationStatus);
  let overlayMessage: string | null = null;
  if (backendStatus !== "CONNECTED") overlayMessage = "Backend disconnected";
  else if (!streamConnected) overlayMessage = "Waiting for camera stream...";
  else if (!simActive)
    overlayMessage = simulationStatus === "STOPPED" ? "Simulation stopped" : "Simulation idle";
  else if (!update) overlayMessage = "Waiting for camera stream...";

  const strokeScale = Math.max(width, height) / 640; // keep overlay proportions stable

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border viewport-grid",
        className,
      )}
    >
      <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        {src && (
          <img
            src={src}
            alt="Simulated camera frame"
            className="absolute inset-0 h-full w-full object-fill select-none"
            draggable={false}
          />
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* FOV boundary */}
          <rect
            x={1}
            y={1}
            width={width - 2}
            height={height - 2}
            fill="none"
            stroke="var(--color-crosshair)"
            strokeOpacity={0.5}
            strokeWidth={1.5 * strokeScale}
            strokeDasharray={`${8 * strokeScale} ${6 * strokeScale}`}
          />
          {/* FOV tick marks at edges */}
          {[0.25, 0.5, 0.75].map((f) => (
            <g
              key={f}
              stroke="var(--color-crosshair)"
              strokeOpacity={0.45}
              strokeWidth={1 * strokeScale}
            >
              <line x1={width * f} y1={0} x2={width * f} y2={8 * strokeScale} />
              <line x1={width * f} y1={height} x2={width * f} y2={height - 8 * strokeScale} />
              <line x1={0} y1={height * f} x2={8 * strokeScale} y2={height * f} />
              <line x1={width} y1={height * f} x2={width - 8 * strokeScale} y2={height * f} />
            </g>
          ))}

          <defs>
            <marker
              id="vector-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Camera centre crosshair & optical axis marker */}
          {(() => {
            const distToDesignated = designated
              ? Math.hypot(designated.x - center.x, designated.y - center.y)
              : 999;
            // Shift optical axis label if designated target is in top-right near center
            const shiftDown = distToDesignated < 45 && designated && designated.y <= center.y;
            const textX = center.x + 14 * strokeScale;
            const textY = shiftDown
              ? center.y + 18 * strokeScale
              : center.y - 8 * strokeScale;

            return (
              <g stroke="var(--color-crosshair)" strokeWidth={1.5 * strokeScale} strokeOpacity={0.95}>
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={12 * strokeScale}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={1 * strokeScale}
                  strokeDasharray={`${4 * strokeScale} ${3 * strokeScale}`}
                />
                <line
                  x1={center.x - 22 * strokeScale}
                  y1={center.y}
                  x2={center.x - 4 * strokeScale}
                  y2={center.y}
                  stroke="#38bdf8"
                />
                <line
                  x1={center.x + 4 * strokeScale}
                  y1={center.y}
                  x2={center.x + 22 * strokeScale}
                  y2={center.y}
                  stroke="#38bdf8"
                />
                <line
                  x1={center.x}
                  y1={center.y - 22 * strokeScale}
                  x2={center.x}
                  y2={center.y - 4 * strokeScale}
                  stroke="#38bdf8"
                />
                <line
                  x1={center.x}
                  y1={center.y + 4 * strokeScale}
                  x2={center.x}
                  y2={center.y + 22 * strokeScale}
                  stroke="#38bdf8"
                />
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={2 * strokeScale}
                  fill="#38bdf8"
                  stroke="none"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="#38bdf8"
                  fontSize={9 * strokeScale}
                  fontFamily="var(--font-mono)"
                  opacity={0.8}
                >
                  OPTICAL AXIS (320, 240)
                </text>
              </g>
            );
          })()}

          {/* Prominent error vector from camera center to designated target */}
          {designated && (
            (() => {
              const errX = update?.error?.x ?? (designated.x - center.x);
              const errY = update?.error?.y ?? (designated.y - center.y);
              const errMag = update?.error?.magnitude ?? Math.hypot(errX, errY);
              const midX = (center.x + designated.x) / 2;
              const midY = (center.y + designated.y) / 2;
              return (
                <g>
                  {/* Tracking vector line with arrowhead */}
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={designated.x}
                    y2={designated.y}
                    stroke="#f59e0b"
                    strokeWidth={2 * strokeScale}
                    strokeOpacity={0.9}
                    markerEnd="url(#vector-arrow)"
                  />
                  {/* Label pill along vector if error > 18 px to avoid boresight clutter */}
                  {errMag > 18 && (
                    <g transform={`translate(${midX}, ${midY - 10 * strokeScale})`}>
                      <rect
                        x={-42 * strokeScale}
                        y={-8 * strokeScale}
                        width={84 * strokeScale}
                        height={16 * strokeScale}
                        rx={3 * strokeScale}
                        fill="#0f172a"
                        fillOpacity={0.85}
                        stroke="#f59e0b"
                        strokeWidth={0.8 * strokeScale}
                      />
                      <text
                        x={0}
                        y={3 * strokeScale}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize={8.5 * strokeScale}
                        fontFamily="var(--font-mono)"
                        fontWeight="bold"
                      >
                        Δ({fmtSigned(errX, 0)}, {fmtSigned(errY, 0)}) |e|={fmt(errMag, 1)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()
          )}

          {targets.map((t) => {
            const isDesignated = t.id === designatedId;
            const r = (isDesignated ? 8 : 5) * strokeScale;
            const detected = t.detected ?? update?.target_detected ?? true;
            return (
              <g key={t.id}>
                {showUncertainty && isDesignated && t.uncertainty && t.uncertainty > 0 && (
                  <circle
                    cx={t.predicted_x ?? t.x}
                    cy={t.predicted_y ?? t.y}
                    r={t.uncertainty}
                    fill="var(--color-predicted)"
                    fillOpacity={0.08}
                    stroke="var(--color-predicted)"
                    strokeOpacity={0.4}
                    strokeWidth={1 * strokeScale}
                  />
                )}
                {/* Predicted position (diamond from Kalman) */}
                {t.predicted_x !== undefined && t.predicted_y !== undefined && (
                  <polygon
                    points={[
                      `${t.predicted_x},${t.predicted_y - r * 1.3}`,
                      `${t.predicted_x + r * 1.3},${t.predicted_y}`,
                      `${t.predicted_x},${t.predicted_y + r * 1.3}`,
                      `${t.predicted_x - r * 1.3},${t.predicted_y}`,
                    ].join(" ")}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={1.5 * strokeScale}
                  />
                )}
                {/* Target Beacon & Box */}
                {detected && (
                  <>
                    <circle
                      cx={t.x}
                      cy={t.y}
                      r={r * 0.6}
                      fill="#22c55e"
                      fillOpacity={0.95}
                    />
                    {isDesignated && (
                      <g>
                        <rect
                          x={t.x - r * 2.0}
                          y={t.y - r * 2.0}
                          width={r * 4.0}
                          height={r * 4.0}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={1.75 * strokeScale}
                        />
                        {/* Corner brackets */}
                        <line x1={t.x - r * 2.0} y1={t.y - r * 2.0} x2={t.x - r * 1.2} y2={t.y - r * 2.0} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x - r * 2.0} y1={t.y - r * 2.0} x2={t.x - r * 2.0} y2={t.y - r * 1.2} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x + r * 2.0} y1={t.y - r * 2.0} x2={t.x + r * 1.2} y2={t.y - r * 2.0} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x + r * 2.0} y1={t.y - r * 2.0} x2={t.x + r * 2.0} y2={t.y - r * 1.2} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x - r * 2.0} y1={t.y + r * 2.0} x2={t.x - r * 1.2} y2={t.y + r * 2.0} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x - r * 2.0} y1={t.y + r * 2.0} x2={t.x - r * 2.0} y2={t.y + r * 1.2} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x + r * 2.0} y1={t.y + r * 2.0} x2={t.x + r * 1.2} y2={t.y + r * 2.0} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                        <line x1={t.x + r * 2.0} y1={t.y + r * 2.0} x2={t.x + r * 2.0} y2={t.y + r * 1.2} stroke="#34d399" strokeWidth={2.5 * strokeScale} />
                      </g>
                    )}
                    {/* Target tag with intelligent quadrant offset */}
                    {(() => {
                      const tagWidth = 72 * strokeScale;
                      const flipLeft = t.x + r * 2.4 + tagWidth > width - 10;
                      const flipDown = t.y - r * 1.4 < 20;
                      const tagX = flipLeft ? t.x - r * 2.4 - tagWidth : t.x + r * 2.4;
                      const tagY = flipDown ? t.y + r * 1.4 + 6 * strokeScale : t.y - r * 1.4;

                      return (
                        <g transform={`translate(${tagX}, ${tagY})`}>
                          <rect
                            x={-2 * strokeScale}
                            y={-8 * strokeScale}
                            width={tagWidth}
                            height={16 * strokeScale}
                            rx={2 * strokeScale}
                            fill="#020617"
                            fillOpacity={0.85}
                            stroke="#10b981"
                            strokeWidth={0.5 * strokeScale}
                          />
                          <text
                            x={2 * strokeScale}
                            y={3 * strokeScale}
                            fill="#4ade80"
                            fontSize={9 * strokeScale}
                            fontFamily="var(--font-mono)"
                            fontWeight="bold"
                          >
                            T{t.id} {isDesignated ? `[${fmt((t.confidence ?? update?.confidence ?? 0.95) * 100, 0)}%]` : ""}
                          </text>
                        </g>
                      );
                    })()}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* HUD: top-left frame info */}
        {update && !overlayMessage && (
          <div className="absolute left-2 top-2 flex flex-col gap-0.5 rounded-sm bg-background/70 px-2 py-1 numeric text-[11px] text-foreground/90 backdrop-blur-sm">
            <span>
              FRAME {update.frame_id} · {width}×{height}
            </span>
            <span className="text-muted-foreground">
              ERR {fmtSigned(update.error?.x, 0)} / {fmtSigned(update.error?.y, 0)} px · |e|{" "}
              {fmt(update.error?.magnitude, 2)} px
            </span>
          </div>
        )}

        {/* HUD: top-right target status and detector badge */}
        {update && !overlayMessage && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            {update.detector_mode && (
              <div
                className={cn(
                  "rounded-sm px-2 py-1 label-tech backdrop-blur-sm border text-[11px]",
                  update.detector_mode === "AI"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : update.detector_mode === "HYBRID"
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                )}
              >
                {update.detector_mode}
                {update.ai_inference_ms !== undefined && update.ai_inference_ms !== null && (
                  <span className="ml-1 opacity-80 font-mono">({update.ai_inference_ms.toFixed(1)}ms)</span>
                )}
              </div>
            )}
            <div
              className={cn(
                "rounded-sm px-2 py-1 label-tech backdrop-blur-sm text-[11px]",
                update.target_detected ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
              )}
            >
              {update.target_detected ? "Target detected" : "Target not detected"}
            </div>
          </div>
        )}

        {overlayMessage && (
          <div className="absolute inset-0 grid place-items-center bg-background/40">
            <div className="rounded-md border border-border bg-card/90 px-4 py-2.5 text-sm text-muted-foreground">
              {overlayMessage}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-card/80 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold leading-none">■</span> Beacon & Box
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-sky-400 text-base leading-none">✛</span> Optical Center (320, 240)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-purple-400 text-base leading-none">◇</span> Prediction Marker
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold leading-none">➔</span> Error Vector (Δx, Δy)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 border border-dashed border-crosshair/60" /> FOV Boundary
        </span>
        {showUncertainty && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full border border-predicted/50 bg-predicted/10" />{" "}
            Uncertainty (1σ)
          </span>
        )}
      </div>
    </div>
  );
}
