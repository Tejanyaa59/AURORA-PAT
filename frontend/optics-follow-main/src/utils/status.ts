import type { SimulationStatus } from "@/types/simulation";
import type { WebSocketStatus } from "@/types/tracking";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

export const SIMULATION_STATUS_INFO: Record<SimulationStatus, { tone: Tone; description: string }> =
  {
    IDLE: { tone: "muted", description: "Simulation not started. Configure and press START." },
    INITIALIZING: {
      tone: "info",
      description: "Engine initialising camera model and target scene.",
    },
    SEARCHING: { tone: "info", description: "Scanning field of view for the beacon." },
    ACQUIRING: { tone: "warning", description: "Beacon detected. Centering camera on target." },
    TRACKING: { tone: "success", description: "Closed-loop tracking active." },
    TARGET_LOST: { tone: "danger", description: "Prediction and reacquisition active." },
    "RE-ACQUIRING": {
      tone: "warning",
      description: "Re-detecting beacon near predicted position.",
    },
    TRACKING_LOCKED: {
      tone: "success",
      description: "Target acquired and tracking within limits.",
    },
    PAUSED: { tone: "muted", description: "Simulation paused. Press RESUME to continue." },
    STOPPED: { tone: "muted", description: "Simulation stopped." },
  };

export const ALL_SIMULATION_STATUSES = Object.keys(SIMULATION_STATUS_INFO) as SimulationStatus[];

export function normalizeStatus(raw: string | undefined | null): SimulationStatus {
  if (!raw) return "IDLE";
  const key = raw
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^RE_ACQUIRING$/, "RE-ACQUIRING");
  return (ALL_SIMULATION_STATUSES as string[]).includes(key) ? (key as SimulationStatus) : "IDLE";
}

export function statusTone(status: SimulationStatus | null | undefined): Tone {
  return status ? SIMULATION_STATUS_INFO[status].tone : "muted";
}

export const WS_STATUS_INFO: Record<WebSocketStatus, { tone: Tone; label: string }> = {
  CONNECTING: { tone: "info", label: "STREAM CONNECTING" },
  CONNECTED: { tone: "success", label: "LIVE STREAM CONNECTED" },
  RECONNECTING: { tone: "warning", label: "STREAM RECONNECTING" },
  DISCONNECTED: { tone: "muted", label: "STREAM DISCONNECTED" },
  ERROR: { tone: "danger", label: "STREAM ERROR" },
};

export type BackendStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "CHECKING";

export const BACKEND_STATUS_INFO: Record<BackendStatus, { tone: Tone; label: string }> = {
  CHECKING: { tone: "info", label: "BACKEND CHECKING" },
  CONNECTED: { tone: "success", label: "BACKEND CONNECTED" },
  DISCONNECTED: { tone: "muted", label: "BACKEND OFFLINE" },
  ERROR: { tone: "danger", label: "BACKEND ERROR" },
};

export const TONE_DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-muted-foreground/60",
};

export const TONE_TEXT_CLASS: Record<Tone, string> = {
  neutral: "text-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-muted-foreground",
};

export const TONE_BORDER_CLASS: Record<Tone, string> = {
  neutral: "border-border",
  info: "border-info/50",
  success: "border-success/50",
  warning: "border-warning/50",
  danger: "border-danger/50",
  muted: "border-border",
};

export const TONE_BG_SOFT_CLASS: Record<Tone, string> = {
  neutral: "bg-secondary",
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
  muted: "bg-secondary",
};
