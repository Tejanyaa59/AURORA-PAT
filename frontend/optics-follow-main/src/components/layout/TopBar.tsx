import { Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";
import { fmt, humanStatus } from "@/utils/format";
import { BACKEND_STATUS_INFO, SIMULATION_STATUS_INFO, WS_STATUS_INFO } from "@/utils/status";
import { StatusPill } from "./StatusPill";

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { backend, stream, simulationStatus, liveFps, statusSource } = useAppState();
  const b = BACKEND_STATUS_INFO[backend.status];
  const w = WS_STATUS_INFO[stream.wsStatus];
  const s = SIMULATION_STATUS_INFO[simulationStatus];

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card/60 px-3 md:px-4 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <Menu />
      </Button>
      <div className="min-w-0 mr-auto">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold tracking-tight truncate">
            AURORA-PAT
          </h1>
          <span className="hidden md:inline-flex items-center rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
            v2.4
          </span>
        </div>
        <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
          Free-Space Optical Terminal Coarse Alignment Console
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <StatusPill
          tone={b.tone}
          label={b.label}
          pulse={backend.status === "CHECKING"}
          title={backend.error ?? undefined}
        />
        <StatusPill
          tone={w.tone}
          label={w.label}
          pulse={stream.wsStatus === "CONNECTING" || stream.wsStatus === "RECONNECTING"}
          title={stream.wsDetail ?? undefined}
          className="hidden sm:inline-flex"
        />
        <StatusPill
          tone={s.tone}
          label={`SIM ${humanStatus(simulationStatus)}`}
          pulse={simulationStatus === "TARGET_LOST" || simulationStatus === "RE-ACQUIRING"}
          title={statusSource === "none" ? "No status from backend" : `Source: ${statusSource}`}
        />
        <div className="hidden lg:flex items-center gap-1.5 rounded-sm border border-border bg-secondary/60 px-2.5 py-1">
          <span className="label-tech">FPS</span>
          <span className="numeric text-sm leading-none">{fmt(liveFps, 1)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Re-check backend"
          onClick={() => void backend.checkNow()}
          aria-label="Re-check backend connection"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
    </header>
  );
}
