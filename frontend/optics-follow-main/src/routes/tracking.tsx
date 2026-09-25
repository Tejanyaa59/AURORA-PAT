import { createFileRoute } from "@tanstack/react-router";
import { Plug, Trash2 } from "lucide-react";
import { CameraViewport } from "@/components/camera/CameraViewport";
import { PageHeader, Panel } from "@/components/layout/Panel";
import { TestSequenceBar } from "@/components/tracking/TestSequenceBar";
import { LiveTelemetryStrip } from "@/components/tracking/LiveTelemetryStrip";
import { TrackingStateTimeline } from "@/components/tracking/TrackingStateTimeline";
import { WorldFOVView } from "@/components/tracking/WorldFOVView";
import { AlignmentStatusPanel } from "@/components/tracking/AlignmentStatusPanel";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Real-Time Tracking — AURORA-PAT" },
      {
        name: "description",
        content:
          "Dual live camera and world FOV tracking view with closed-loop gimbal telemetry and operational status.",
      },
      { property: "og:title", content: "Real-Time Tracking — AURORA-PAT" },
      {
        property: "og:description",
        content: "Dual live camera and world FOV tracking view with gimbal telemetry.",
      },
    ],
  }),
  component: TrackingPage,
});

function TrackingPage() {
  const { stream, backend, simulation, simulationStatus, configState } = useAppState();
  const latest = stream.latest;
  const isSimRunning = simulationStatus !== "IDLE" && simulationStatus !== "STOPPED";

  return (
    <>
      <PageHeader
        title="Real-Time Tracking"
        description="Live optical tracking telemetry, dual camera/world alignment, and gimbal positioning."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={stream.reconnect}>
              <Plug /> Reconnect stream
            </Button>
            <Button variant="ghost" size="sm" onClick={stream.clearHistory}>
              <Trash2 /> Clear history
            </Button>
          </>
        }
      />

      {/* 1. Automated Test Sequence & Quick Controls */}
      <TestSequenceBar
        update={latest}
        config={configState.config}
        onApplyConfig={(cfg) => {
          configState.update(() => cfg);
          return simulation.applyConfig(cfg);
        }}
        onStartSim={() => void simulation.runAction("start")}
        onStopSim={() => void simulation.runAction("stop")}
        onResetSim={() => void simulation.runAction("reset")}
        isRunning={isSimRunning}
      />

      {/* 2. Compact Live Telemetry Strip (STATE, ERROR |e|, CONFIDENCE, FPS, PAN, TILT) */}
      <div className="mt-3">
        <LiveTelemetryStrip update={latest} status={simulationStatus} />
      </div>

      {/* 3. Dual Live View: Left = Camera Viewport, Right = World / FOV Footprint View */}
      <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Panel
          title="Camera Viewport"
          subtitle="Live sensor frame, target beacon, optical center, and pointing error vector"
          bodyClassName="p-3"
          actions={
            <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-md border border-border/60 text-xs">
              {(["AI", "HYBRID", "OPENCV"] as const).map((m) => {
                const active = (latest?.detector_mode ?? configState.config.target.detector_mode ?? "AI") === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const newCfg = {
                        ...configState.config,
                        target: { ...configState.config.target, detector_mode: m },
                      };
                      configState.update(() => newCfg);
                      void simulation.applyConfig(newCfg);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          }
        >
          <CameraViewport
            update={latest}
            backendStatus={backend.status}
            streamConnected={stream.wsStatus === "CONNECTED"}
            simulationStatus={simulationStatus}
            fallbackWidth={configState.config.camera.width}
            fallbackHeight={configState.config.camera.height}
          />
        </Panel>

        <Panel
          title="World Space & FOV"
          subtitle="Target trajectory, camera field of view, and pointing aim direction"
          bodyClassName="p-3"
        >
          <WorldFOVView
            update={latest}
            fallbackWidth={configState.config.camera.width}
            fallbackHeight={configState.config.camera.height}
          />
        </Panel>
      </div>

      {/* 4. Alignment Status Panel directly under Dual Live View */}
      <div className="mt-3">
        <AlignmentStatusPanel update={latest} status={simulationStatus} />
      </div>

      {/* 5. Tracking State Timeline */}
      <div className="mt-3">
        <TrackingStateTimeline currentStatus={simulationStatus} />
      </div>
    </>
  );
}
