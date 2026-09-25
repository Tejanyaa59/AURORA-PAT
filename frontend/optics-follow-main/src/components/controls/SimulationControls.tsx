import { Loader2, Pause, Play, RotateCcw, Square, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";
import type { SimulationAction, SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";

const RUNNING: SimulationStatus[] = [
  "INITIALIZING",
  "SEARCHING",
  "ACQUIRING",
  "TRACKING",
  "TARGET_LOST",
  "RE-ACQUIRING",
  "TRACKING_LOCKED",
];

/** Allowed actions derived from backend-reported status only. */
export function allowedActions(
  status: SimulationStatus,
  backendConnected: boolean,
): Record<SimulationAction, boolean> {
  if (!backendConnected)
    return { start: false, pause: false, resume: false, stop: false, reset: false };
  const running = RUNNING.includes(status);
  return {
    start: status === "IDLE" || status === "STOPPED",
    pause: running,
    resume: status === "PAUSED",
    stop: running || status === "PAUSED",
    reset: status !== "IDLE" || true,
  };
}

export function SimulationControls({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { simulation, simulationStatus, backend } = useAppState();
  const allowed = allowedActions(simulationStatus, backend.status === "CONNECTED");
  const busy = simulation.busyAction;

  const btn = (
    action: SimulationAction,
    label: string,
    Icon: typeof Play,
    variant: "default" | "outline" | "destructive" | "secondary" = "outline",
  ) => (
    <Button
      key={action}
      variant={variant}
      size={compact ? "sm" : "default"}
      disabled={!allowed[action] || busy !== null}
      onClick={() => void simulation.runAction(action)}
      className="min-w-[88px]"
    >
      {busy === action ? <Loader2 className="animate-spin" /> : <Icon />}
      {label}
    </Button>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {btn("start", "Start", Play, "default")}
      {btn("pause", "Pause", Pause)}
      {btn("resume", "Resume", StepForward)}
      {btn("stop", "Stop", Square, "destructive")}
      {btn("reset", "Reset", RotateCcw, "secondary")}
      {backend.status !== "CONNECTED" && (
        <span className="text-xs text-muted-foreground ml-1">
          Controls disabled — backend offline.
        </span>
      )}
    </div>
  );
}
