import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { simulationApi } from "@/api/simulationApi";
import { KeyValue, PageHeader, Panel } from "@/components/layout/Panel";
import { StatusPill } from "@/components/layout/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/hooks/appState";
import { DEFAULT_API_BASE_URL, isValidHttpUrl } from "@/utils/apiConfig";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "System Settings — FSOC Virtual Camera" },
      {
        name: "description",
        content:
          "Configure backend connection URL, test REST/WebSocket health, and manage system state.",
      },
      { property: "og:title", content: "System Settings — FSOC Virtual Camera" },
      {
        property: "og:description",
        content: "FSOC terminal connection parameters and diagnostics.",
      },
    ],
  }),
  component: SettingsPage,
});

export function SettingsPage() {
  const { apiBaseUrl, wsUrl, setApiBaseUrl, backend, stream, configState } = useAppState();
  const [inputUrl, setInputUrl] = useState(apiBaseUrl);
  const [testingRest, setTestingRest] = useState(false);
  const [restTestResult, setRestTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [testingWs, setTestingWs] = useState(false);
  const [wsTestResult, setWsTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  const handleSave = () => {
    const trimmed = inputUrl.trim();
    if (!isValidHttpUrl(trimmed)) {
      toast.error("Invalid API URL", {
        description: "Please enter a valid HTTP/HTTPS URL (e.g. http://localhost:8000).",
      });
      return;
    }
    setApiBaseUrl(trimmed);
    toast.success("Backend URL updated", { description: `Now connecting to: ${trimmed}` });
    void backend.checkNow();
  };

  const handleResetUrl = () => {
    setInputUrl(DEFAULT_API_BASE_URL);
    setApiBaseUrl(null); // clears localStorage override
    toast.info("Reset to default URL", { description: DEFAULT_API_BASE_URL });
  };

  const handleTestRest = async () => {
    setTestingRest(true);
    setRestTestResult(null);
    const start = performance.now();
    try {
      const res = await simulationApi.health();
      const latencyMs = Math.round(performance.now() - start);
      setRestTestResult({
        ok: true,
        latencyMs,
        message: `HTTP 200 OK · Latency ${latencyMs} ms · Version: ${res?.version ?? "1.0"}`,
      });
      toast.success("REST connection verified", { description: `Response in ${latencyMs} ms.` });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      setRestTestResult({
        ok: false,
        latencyMs,
        message: `Failed to connect after ${latencyMs} ms. Check if the backend server is running.`,
      });
      toast.error("REST connection failed");
    } finally {
      setTestingRest(false);
    }
  };

  const handleTestWs = () => {
    setTestingWs(true);
    setWsTestResult(null);
    const start = performance.now();
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      setWsTestResult({ ok: false, latencyMs: 0, message: "Invalid WebSocket URL syntax." });
      setTestingWs(false);
      return;
    }

    const timer = setTimeout(() => {
      socket.close();
      setWsTestResult({
        ok: false,
        latencyMs: 5000,
        message: "WebSocket connection timed out (5s).",
      });
      setTestingWs(false);
    }, 5000);

    socket.onopen = () => {
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - start);
      setWsTestResult({
        ok: true,
        latencyMs,
        message: `WebSocket handshake established in ${latencyMs} ms.`,
      });
      toast.success("WebSocket handshake successful");
      socket.close();
      setTestingWs(false);
    };

    socket.onerror = () => {
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - start);
      setWsTestResult({
        ok: false,
        latencyMs,
        message: `Handshake failed after ${latencyMs} ms. Ensure backend WebSocket route /ws/tracking is active.`,
      });
      setTestingWs(false);
    };
  };

  const handleResetAppState = () => {
    configState.resetToDefaults();
    stream.clearHistory();
    toast.success("Application state reset", {
      description: "Simulation config and telemetry buffers cleared.",
    });
  };

  return (
    <>
      <PageHeader
        title="Settings & Diagnostics"
        description="Configure backend host, test endpoints, and manage local application state."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          {/* Backend Connection Config */}
          <Panel
            title="Backend server configuration"
            subtitle="Configure connection to the FSOC simulation server"
            actions={
              <StatusPill
                tone={backend.status === "CONNECTED" ? "success" : "muted"}
                label={backend.status === "CONNECTED" ? "CONNECTED" : "OFFLINE"}
              />
            }
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="backend-url" className="label-tech">
                  Backend API Base URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="backend-url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="font-mono text-xs"
                  />
                  <Button onClick={handleSave} size="sm">
                    <Check /> Save & Apply
                  </Button>
                  <Button onClick={handleResetUrl} variant="outline" size="sm">
                    <RotateCcw /> Default
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Default: <span className="font-mono">{DEFAULT_API_BASE_URL}</span>. All REST calls
                  target <span className="font-mono">{inputUrl}/api/...</span>
                </p>
              </div>

              <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Derived WebSocket URL:</span>
                  <span className="font-mono text-foreground font-medium">{wsUrl}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active REST URL:</span>
                  <span className="font-mono text-foreground font-medium">{apiBaseUrl}/api</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Connection Diagnostics */}
          <Panel
            title="Connection diagnostics"
            subtitle="Verify HTTP REST and WebSocket stream connectivity"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* REST Test Card */}
              <div className="rounded-md border border-border bg-card/60 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="label-tech flex items-center gap-1.5">
                      <Server className="size-3.5 text-primary" /> REST Health Check
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      GET /api/health
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verifies whether the backend server is online and accepting REST calls.
                  </p>
                  {restTestResult && (
                    <div
                      className={`text-xs p-2 rounded-sm border ${
                        restTestResult.ok
                          ? "bg-success/10 border-success/30 text-success"
                          : "bg-danger/10 border-danger/30 text-danger"
                      }`}
                    >
                      {restTestResult.message}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleTestRest}
                    disabled={testingRest}
                  >
                    {testingRest ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    {testingRest ? "Testing REST..." : "Test REST Health"}
                  </Button>
                </div>
              </div>

              {/* WebSocket Test Card */}
              <div className="rounded-md border border-border bg-card/60 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="label-tech flex items-center gap-1.5">
                      <Radio className="size-3.5 text-primary" /> WebSocket Handshake
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      /ws/tracking
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Validates real-time bidirectional telemetry streaming handshake.
                  </p>
                  {wsTestResult && (
                    <div
                      className={`text-xs p-2 rounded-sm border ${
                        wsTestResult.ok
                          ? "bg-success/10 border-success/30 text-success"
                          : "bg-danger/10 border-danger/30 text-danger"
                      }`}
                    >
                      {wsTestResult.message}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleTestWs}
                    disabled={testingWs}
                  >
                    {testingWs ? <Loader2 className="animate-spin" /> : <Wifi />}
                    {testingWs ? "Testing WebSocket..." : "Test WebSocket Stream"}
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Reset Application State */}
          <Panel
            title="Local application state"
            subtitle="Reset stored simulation draft configuration and in-memory chart telemetry"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Reset state &amp; telemetry buffer</p>
                <p className="text-xs text-muted-foreground">
                  Clears local drafts (`fsoc.simulationConfig`) and flushes buffered time-series
                  samples.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleResetAppState}>
                <RotateCcw /> Reset Application State
              </Button>
            </div>
          </Panel>
        </div>

        {/* Diagnostic Sidebar */}
        <div className="flex flex-col gap-4 min-w-0">
          <Panel title="System environment" subtitle="Client execution context">
            <KeyValue label="Frontend framework" value="React 19 / TanStack" mono={false} />
            <KeyValue label="Styling engine" value="Tailwind CSS v4" mono={false} />
            <KeyValue label="WebSocket client" value="Active (auto-backoff)" mono={false} />
            <KeyValue
              label="Live FPS sample rate"
              value={
                stream.latest?.performance?.fps
                  ? `${stream.latest.performance.fps.toFixed(1)} fps`
                  : "Inactive"
              }
            />
            <KeyValue label="Buffered samples" value={stream.history.length} />
          </Panel>

          <Panel title="Service endpoints" subtitle="Active communication routes">
            <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
              <div className="flex justify-between">
                <span>GET /api/health</span>
                <span className="text-primary">Status</span>
              </div>
              <div className="flex justify-between">
                <span>POST /api/simulation/*</span>
                <span className="text-primary">Controls</span>
              </div>
              <div className="flex justify-between">
                <span>GET /api/metrics</span>
                <span className="text-primary">KPIs</span>
              </div>
              <div className="flex justify-between">
                <span>GET /api/report</span>
                <span className="text-primary">Report</span>
              </div>
              <div className="flex justify-between">
                <span>POST /api/video/upload</span>
                <span className="text-primary">Video</span>
              </div>
              <div className="flex justify-between">
                <span>WS /ws/tracking</span>
                <span className="text-primary">Stream</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
