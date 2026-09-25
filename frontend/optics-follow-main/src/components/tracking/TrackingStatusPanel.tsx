import type { SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";
import { humanStatus } from "@/utils/format";
import {
  SIMULATION_STATUS_INFO,
  TONE_BG_SOFT_CLASS,
  TONE_BORDER_CLASS,
  TONE_DOT_CLASS,
  TONE_TEXT_CLASS,
  type BackendStatus,
} from "@/utils/status";

const PIPELINE: SimulationStatus[] = [
  "INITIALIZING",
  "SEARCHING",
  "ACQUIRING",
  "TRACKING",
  "TARGET_LOST",
  "RE-ACQUIRING",
  "TRACKING_LOCKED",
];

interface Props {
  status: SimulationStatus;
  backendStatus: BackendStatus;
  source: "stream" | "rest" | "none";
  message?: string | undefined;
  compact?: boolean | undefined;
}

export function TrackingStatusPanel({ status, backendStatus, source, message, compact }: Props) {
  const offline = backendStatus !== "CONNECTED";
  const info = SIMULATION_STATUS_INFO[status];
  const tone = offline ? "muted" : info.tone;
  const title = offline ? "BACKEND DISCONNECTED" : humanStatus(status);
  const description = offline
    ? "No status available. Connect to the backend server to receive tracking state."
    : (message ?? info.description);

  return (
    <div className={cn("panel overflow-hidden", TONE_BORDER_CLASS[tone])}>
      <div className={cn("px-4 py-4", TONE_BG_SOFT_CLASS[tone])}>
        <div className="flex items-center justify-between gap-2">
          <span className="label-tech">Tracking state</span>
          <span className="label-tech text-[10px] opacity-70">
            {source === "stream" ? "live" : source === "rest" ? "polled" : "no data"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={cn(
              "size-3 rounded-full shrink-0",
              TONE_DOT_CLASS[tone],
              (status === "TARGET_LOST" || status === "RE-ACQUIRING" || status === "SEARCHING") &&
                !offline &&
                "animate-status-pulse",
            )}
          />
          <span
            className={cn(
              "font-semibold tracking-tight leading-none",
              compact ? "text-xl" : "text-2xl",
              TONE_TEXT_CLASS[tone],
            )}
          >
            {title}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {!compact && (
        <ol className="grid grid-cols-7 gap-px bg-border border-t border-border">
          {PIPELINE.map((s) => {
            const active = !offline && s === status;
            const t = SIMULATION_STATUS_INFO[s].tone;
            return (
              <li
                key={s}
                className={cn(
                  "bg-card px-1 py-2 text-center text-[9px] leading-tight tracking-wider uppercase",
                  active
                    ? cn("font-semibold", TONE_TEXT_CLASS[t], TONE_BG_SOFT_CLASS[t])
                    : "text-muted-foreground/60",
                )}
                title={SIMULATION_STATUS_INFO[s].description}
              >
                {humanStatus(s)}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
