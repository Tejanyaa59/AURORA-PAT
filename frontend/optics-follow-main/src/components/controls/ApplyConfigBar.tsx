import { Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";

/** Shared footer for every configuration page: sends the draft config to the backend. */
export function ApplyConfigBar({ note }: { note?: string }) {
  const { simulation, configState, backend } = useAppState();
  const busy = simulation.busyAction === "configure";
  const offline = backend.status !== "CONNECTED";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card/60 px-4 py-3">
      <Button
        disabled={busy || offline}
        onClick={() => void simulation.applyConfig(configState.config)}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        Apply to backend
      </Button>
      <Button variant="secondary" onClick={configState.resetToDefaults} disabled={busy}>
        <RotateCcw /> Reset defaults
      </Button>
      <p className="text-xs text-muted-foreground">
        {offline
          ? "Backend offline — configuration is stored locally until it reconnects."
          : (note ??
            "Changes are stored locally and sent to POST /api/simulation/configure on apply.")}
      </p>
    </div>
  );
}
