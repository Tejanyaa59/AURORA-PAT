import { useMemo, useState, useEffect, useRef } from "react";
import type { TrackingUpdate } from "@/types/tracking";
import { cn } from "@/lib/utils";
import { fmt, fmtSigned } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Crosshair, Eye, Maximize2, Minimize2, Trash2 } from "lucide-react";

interface WorldFOVViewProps {
  update: TrackingUpdate | null;
  className?: string;
  fallbackWidth?: number;
  fallbackHeight?: number;
}

interface Point {
  x: number;
  y: number;
  detected?: boolean;
}

const WORLD_SIZE = 2000;
const WORLD_CENTER = 1000;
const DEG_PER_PX = 60.0 / 640.0; // 0.09375 deg/px

export function WorldFOVView({
  update,
  className,
  fallbackWidth = 640,
  fallbackHeight = 480,
}: WorldFOVViewProps) {
  const [zoomMode, setZoomMode] = useState<"track" | "full">("track");
  const [targetTrail, setTargetTrail] = useState<Point[]>([]);
  const [camTrail, setCamTrail] = useState<Point[]>([]);
  const lastFrameIdRef = useRef<number>(-1);

  const pan = update?.camera?.pan ?? 0;
  const tilt = update?.camera?.tilt ?? 0;

  // Compute camera aim point in world coordinates
  const camAimX = WORLD_CENTER + pan / DEG_PER_PX;
  const camAimY = WORLD_CENTER - tilt / DEG_PER_PX;

  // Sensor dimensions
  const camFovW = update?.frame_info?.width ?? fallbackWidth;
  const camFovH = update?.frame_info?.height ?? fallbackHeight;
  const fovLeft = camAimX - camFovW / 2;
  const fovTop = camAimY - camFovH / 2;

  // Target coordinates
  const targetCamX = update?.target?.x ?? null;
  const targetCamY = update?.target?.y ?? null;
  const targetDetected = update?.target_detected ?? false;

  const targetWorldX = targetCamX !== null ? fovLeft + targetCamX : null;
  const targetWorldY = targetCamY !== null ? fovTop + targetCamY : null;

  // Kalman predicted coordinates
  const predCamX = update?.target?.predicted_x ?? null;
  const predCamY = update?.target?.predicted_y ?? null;
  const predWorldX = predCamX !== null ? fovLeft + predCamX : null;
  const predWorldY = predCamY !== null ? fovTop + predCamY : null;

  // Update breadcrumb trails on new frame
  useEffect(() => {
    if (!update || update.frame_id === lastFrameIdRef.current) return;
    lastFrameIdRef.current = update.frame_id;

    if (update.status === "IDLE") {
      setTargetTrail([]);
      setCamTrail([]);
      return;
    }

    setCamTrail((prev) => {
      const next = [...prev, { x: camAimX, y: camAimY }];
      return next.length > 70 ? next.slice(next.length - 70) : next;
    });

    if (targetWorldX !== null && targetWorldY !== null && targetDetected) {
      setTargetTrail((prev) => {
        const next = [...prev, { x: targetWorldX, y: targetWorldY, detected: true }];
        return next.length > 70 ? next.slice(next.length - 70) : next;
      });
    }
  }, [update?.frame_id, update?.status, camAimX, camAimY, targetWorldX, targetWorldY, targetDetected]);

  // ViewBox bounds
  const viewBox = useMemo(() => {
    if (zoomMode === "full") {
      return "0 0 2000 2000";
    }
    // Track region (1300x1300 centered on world origin / active trajectory)
    return "350 350 1300 1300";
  }, [zoomMode]);

  const errorMag = update?.error?.magnitude ?? null;
  const status = update?.status ?? "IDLE";
  const confidence = update?.confidence ?? update?.target?.confidence ?? 0;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border bg-[#070b14] select-none",
        className
      )}
    >
      <div className="relative w-full" style={{ aspectRatio: `${fallbackWidth} / ${fallbackHeight}` }}>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            {/* Background grid pattern */}
            <pattern id="world-fine-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#131c31" strokeWidth="1" />
            </pattern>
            <pattern id="world-coarse-grid" width="250" height="250" patternUnits="userSpaceOnUse">
              <path d="M 250 0 L 0 0 0 250" fill="none" stroke="#1e293b" strokeWidth="1.5" />
            </pattern>

            {/* Glowing filter for beacon */}
            <filter id="beacon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="los-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid background */}
          <rect x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} fill="#060913" />
          <rect x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#world-fine-grid)" />
          <rect x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#world-coarse-grid)" />

          {/* World space boundaries */}
          <rect
            x="2"
            y="2"
            width={WORLD_SIZE - 4}
            height={WORLD_SIZE - 4}
            fill="none"
            stroke="#334155"
            strokeWidth="3"
            strokeDasharray="16 8"
          />

          {/* Subtle concentric reference range rings from Terminal Base (1000, 1000) */}
          <circle
            cx={WORLD_CENTER}
            cy={WORLD_CENTER}
            r="250"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.18"
          />
          <circle
            cx={WORLD_CENTER}
            cy={WORLD_CENTER}
            r="500"
            fill="none"
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="6 6"
            strokeOpacity="0.15"
          />

          {/* Terminal Base origin crosshair axes */}
          <line
            x1="0"
            y1={WORLD_CENTER}
            x2={WORLD_SIZE}
            y2={WORLD_CENTER}
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <line
            x1={WORLD_CENTER}
            y1="0"
            x2={WORLD_CENTER}
            y2={WORLD_SIZE}
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Camera Aim Trail (Closed-loop trajectory history) */}
          {camTrail.length > 1 && (
            <polyline
              points={camTrail.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeOpacity="0.35"
            />
          )}

          {/* Target Trajectory Trail (Breadcrumb trail) */}
          {targetTrail.length > 1 && (
            <polyline
              points={targetTrail.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeOpacity="0.65"
            />
          )}

          {/* Terminal Gimbal Base Origin Marker */}
          <g>
            <circle
              cx={WORLD_CENTER}
              cy={WORLD_CENTER}
              r="14"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <circle cx={WORLD_CENTER} cy={WORLD_CENTER} r="4" fill="#38bdf8" />
            <text
              x={WORLD_CENTER}
              y={WORLD_CENTER + 32}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="16"
              fontWeight="600"
              fontFamily="monospace"
              letterSpacing="1"
            >
              GIMBAL BASE (1000, 1000)
            </text>
          </g>

          {/* LOS Optical Axis: line connecting gimbal base to camera aim point */}
          <line
            x1={WORLD_CENTER}
            y1={WORLD_CENTER}
            x2={camAimX}
            y2={camAimY}
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="8 4"
            filter="url(#los-glow)"
          />

          {/* Camera FOV Footprint (Frustum rectangle in world space) */}
          <g>
            {/* FOV Area fill */}
            <rect
              x={fovLeft}
              y={fovTop}
              width={camFovW}
              height={camFovH}
              fill="rgba(14, 165, 233, 0.06)"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="10 5"
            />

            {/* Corner brackets */}
            {/* Top-Left */}
            <path
              d={`M ${fovLeft} ${fovTop + 30} L ${fovLeft} ${fovTop} L ${fovLeft + 30} ${fovTop}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
            />
            {/* Top-Right */}
            <path
              d={`M ${fovLeft + camFovW - 30} ${fovTop} L ${fovLeft + camFovW} ${fovTop} L ${fovLeft + camFovW} ${fovTop + 30}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
            />
            {/* Bottom-Left */}
            <path
              d={`M ${fovLeft} ${fovTop + camFovH - 30} L ${fovLeft} ${fovTop + camFovH} L ${fovLeft + 30} ${fovTop + camFovH}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
            />
            {/* Bottom-Right */}
            <path
              d={`M ${fovLeft + camFovW - 30} ${fovTop + camFovH} L ${fovLeft + camFovW} ${fovTop + camFovH} L ${fovLeft + camFovW} ${fovTop + camFovH - 30}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
            />

            {/* FOV Header Label */}
            <rect
              x={fovLeft}
              y={fovTop - 24}
              width="240"
              height="24"
              fill="#0f172a"
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <text
              x={fovLeft + 8}
              y={fovTop - 8}
              fill="#38bdf8"
              fontSize="14"
              fontFamily="monospace"
              fontWeight="bold"
            >
              CAMERA FOV (640×480)
            </text>

            {/* Optical Receiver Boresight Crosshair at (camAimX, camAimY) */}
            <g>
              <line
                x1={camAimX - 25}
                y1={camAimY}
                x2={camAimX + 25}
                y2={camAimY}
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <line
                x1={camAimX}
                y1={camAimY - 25}
                x2={camAimX}
                y2={camAimY + 25}
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <circle
                cx={camAimX}
                cy={camAimY}
                r="8"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text
                x={camAimX + 12}
                y={camAimY - 12}
                fill="#38bdf8"
                fontSize="15"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BORESIGHT
              </text>
            </g>
          </g>

          {/* Secondary targets (decoys / clutter) */}
          {update?.targets &&
            update.targets
              .filter((t) => !t.designated)
              .map((decoy) => {
                const decX = fovLeft + decoy.x;
                const decY = fovTop + decoy.y;
                return (
                  <g key={decoy.id}>
                    <circle
                      cx={decX}
                      cy={decY}
                      r="10"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    <circle cx={decX} cy={decY} r="3" fill="#94a3b8" />
                    <text
                      x={decX + 14}
                      y={decY + 5}
                      fill="#94a3b8"
                      fontSize="14"
                      fontFamily="monospace"
                    >
                      DECOY #{decoy.id}
                    </text>
                  </g>
                );
              })}

          {/* Kalman Filter Predicted Position */}
          {predWorldX !== null && predWorldY !== null && (
            <g>
              <circle
                cx={predWorldX}
                cy={predWorldY}
                r="18"
                fill="none"
                stroke="#d946ef"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <line
                x1={predWorldX - 10}
                y1={predWorldY}
                x2={predWorldX + 10}
                y2={predWorldY}
                stroke="#d946ef"
                strokeWidth="2"
              />
              <line
                x1={predWorldX}
                y1={predWorldY - 10}
                x2={predWorldX}
                y2={predWorldY + 10}
                stroke="#d946ef"
                strokeWidth="2"
              />
              <text
                x={predWorldX + 14}
                y={predWorldY - 12}
                fill="#d946ef"
                fontSize="14"
                fontFamily="monospace"
                fontWeight="600"
              >
                KALMAN ESTIMATE
              </text>
            </g>
          )}

          {/* Instantaneous Tracking Error Vector (Boresight -> Target) */}
          {targetWorldX !== null && targetWorldY !== null && (
            <line
              x1={camAimX}
              y1={camAimY}
              x2={targetWorldX}
              y2={targetWorldY}
              stroke={errorMag !== null && errorMag <= 24 ? "#10b981" : "#ef4444"}
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Primary Designated Target Beacon */}
          {targetWorldX !== null && targetWorldY !== null ? (
            <g filter="url(#beacon-glow)">
              {/* Outer pulsing ring */}
              <circle
                cx={targetWorldX}
                cy={targetWorldY}
                r="22"
                fill="none"
                stroke={targetDetected ? "#10b981" : "#f59e0b"}
                strokeWidth="2.5"
                opacity="0.8"
                className="animate-pulse"
              />
              <circle
                cx={targetWorldX}
                cy={targetWorldY}
                r="10"
                fill={targetDetected ? "#10b981" : "#f59e0b"}
              />
              <circle cx={targetWorldX} cy={targetWorldY} r="3" fill="#ffffff" />

              {/* Target callout box */}
              <g transform={`translate(${targetWorldX + 18}, ${targetWorldY - 32})`}>
                <rect
                  x="0"
                  y="0"
                  width="210"
                  height="46"
                  rx="4"
                  fill="#090d16"
                  stroke={targetDetected ? "#10b981" : "#f59e0b"}
                  strokeWidth="1.5"
                  opacity="0.95"
                />
                <text
                  x="8"
                  y="18"
                  fill={targetDetected ? "#10b981" : "#f59e0b"}
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TARGET #1 [DESIGNATED]
                </text>
                <text
                  x="8"
                  y="36"
                  fill="#94a3b8"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  POS: ({targetWorldX.toFixed(0)}, {targetWorldY.toFixed(0)}) | CONF: {(confidence * 100).toFixed(0)}%
                </text>
              </g>
            </g>
          ) : (
            status === "TARGET_LOST" && (
              <g>
                <text
                  x={camAimX}
                  y={camAimY + 60}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="22"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="animate-pulse"
                >
                  ⚠️ TARGET OCCLUSION / LOSS DETECTED
                </text>
              </g>
            )
          )}
        </svg>

        {/* Top-Left Tactical HUD Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded bg-card/85 border border-border px-2 py-1 backdrop-blur-sm">
            <Eye className="size-3 text-primary" />
            <span className="text-[11px] font-mono font-semibold text-foreground">
              WORLD FOV VIEW
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              [2000×2000 px]
            </span>
          </div>
          <div className="rounded bg-card/85 border border-border px-2 py-0.5 backdrop-blur-sm text-[10px] font-mono text-muted-foreground">
            TERMINAL BASE: ({WORLD_CENTER}, {WORLD_CENTER})
          </div>
        </div>

        {/* Top-Right Aim & Gimbal Telemetry Overlay */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
          <div className="rounded bg-card/85 border border-border px-2 py-1 backdrop-blur-sm text-right">
            <div className="text-[11px] font-mono font-semibold text-foreground">
              AIM: ({camAimX.toFixed(0)}, {camAimY.toFixed(0)})
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              PAN: {fmtSigned(pan, 2)}° | TILT: {fmtSigned(tilt, 2)}°
            </div>
          </div>
          {errorMag !== null && (
            <div
              className={cn(
                "rounded border px-2 py-0.5 backdrop-blur-sm text-[10px] font-mono font-semibold",
                errorMag <= 24
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                  : "bg-red-950/80 border-red-500/50 text-red-400"
              )}
            >
              OFFSET: {errorMag.toFixed(1)} px {errorMag <= 24 ? "(LOCKED)" : "(SLEWING)"}
            </div>
          )}
        </div>

        {/* Bottom-Left Mini Legend */}
        <div className="absolute bottom-2 left-2 hidden sm:flex items-center gap-2 rounded bg-card/85 border border-border px-2.5 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-sm border border-sky-400 bg-sky-500/20" />
            <span>FOV</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Beacon</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full border border-dashed border-fuchsia-400" />
            <span>Prediction</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-amber-500" />
            <span>Trajectory</span>
          </div>
          <div className="flex items-center gap-1 pl-1 border-l border-border/60">
            <span className="size-2 rounded-full border border-dashed border-sky-400/40" />
            <span>Ref Rings (R=250/500px)</span>
          </div>
        </div>

        {/* Bottom-Right Controls */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setZoomMode((m) => (m === "track" ? "full" : "track"))}
            className="h-6 px-2 text-[10px] font-mono bg-card/90 border border-border"
          >
            {zoomMode === "track" ? (
              <>
                <Maximize2 className="size-2.5 mr-1" /> Full Space
              </>
            ) : (
              <>
                <Minimize2 className="size-2.5 mr-1" /> Zoom Track
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setTargetTrail([]);
              setCamTrail([]);
            }}
            className="h-6 px-2 text-[10px] font-mono bg-card/90 border border-border"
            title="Clear Trajectory Trail"
          >
            <Trash2 className="size-2.5 mr-1" /> Trail
          </Button>
        </div>
      </div>
    </div>
  );
}
