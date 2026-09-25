import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { metricsApi } from "@/api/metricsApi";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { PageHeader, Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/appState";
import type { PerformanceMetrics } from "@/types/metrics";
import { fmt, fmtPercent, fmtSeconds } from "@/utils/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Performance Analytics — AURORA-PAT" },
      {
        name: "description",
        content:
          "Quantitative tracking error telemetry, framerate stability, and statistical evaluation across demonstration scenarios.",
      },
      { property: "og:title", content: "Performance Analytics — AURORA-PAT" },
      {
        property: "og:description",
        content: "Performance curves, error distribution, and scenario comparison analytics.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const SCENARIO_COMPARISON_DATA = [
  { name: "1. Normal", avgError: 18.0, successRate: 89.6, fps: 28.0 },
  { name: "2. Fast", avgError: 17.1, successRate: 86.1, fps: 29.3 },
  { name: "3. Jitter", avgError: 24.1, successRate: 85.1, fps: 29.8 },
  { name: "4. Low Vis", avgError: 17.4, successRate: 92.0, fps: 14.6 },
  { name: "5. Noise/Blur", avgError: 21.9, successRate: 90.2, fps: 11.7 },
  { name: "6. Loss/Reacq", avgError: 14.0, successRate: 83.0, fps: 20.3 },
  { name: "7. Multi-Target", avgError: 31.0, successRate: 60.2, fps: 22.6 },
];

const tickStyle = {
  fill: "var(--color-muted-foreground)",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
};

function AnalyticsPage() {
  const { stream, backend, simulationStatus } = useAppState();
  const [polledMetrics, setPolledMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const clearedFrameRef = useRef<number>(-1);

  const fetchMetrics = useCallback(async () => {
    if (backend.status !== "CONNECTED") return;
    setLoadingMetrics(true);
    try {
      const data = await metricsApi.getMetrics();
      if (data) {
        setPolledMetrics(data);
        setIsCleared(false);
      }
    } catch {
      /* ignore if offline */
    } finally {
      setLoadingMetrics(false);
    }
  }, [backend.status]);

  // Clean initial state: only poll if a simulation is actively running
  useEffect(() => {
    if (simulationStatus !== "IDLE" && simulationStatus !== "STOPPED") {
      void fetchMetrics();
    } else if (stream.history.length === 0) {
      setIsCleared(true);
    }
  }, []);

  // When a new simulation/tracking run starts, resume collecting and displaying fresh metrics
  useEffect(() => {
    if (isCleared) {
      const isSimActive = simulationStatus !== "IDLE" && simulationStatus !== "STOPPED";
      const hasNewFrame = stream.latest && stream.latest.frame_id !== clearedFrameRef.current;
      if (isSimActive && hasNewFrame) {
        setIsCleared(false);
      }
    }
  }, [isCleared, simulationStatus, stream.latest?.frame_id]);

  const handleClearMetrics = () => {
    stream.clearHistory();
    setPolledMetrics(null);
    setIsCleared(true);
    clearedFrameRef.current = stream.latest?.frame_id ?? -1;
  };

  // Determine effective metrics: null when cleared or when no active run exists
  const effectiveMetrics = isCleared
    ? null
    : (stream.latest?.performance ?? polledMetrics ?? null);

  const fpsVal = effectiveMetrics?.fps != null ? fmt(effectiveMetrics.fps, 1) : "—";
  const avgErr = effectiveMetrics?.average_error != null ? fmt(effectiveMetrics.average_error, 2, " px") : "—";
  const rmsErr = effectiveMetrics?.rms_error != null ? fmt(effectiveMetrics.rms_error, 2, " px") : "—";
  const trackingSuccess = effectiveMetrics?.tracking_success_percentage != null
    ? fmtPercent(effectiveMetrics.tracking_success_percentage)
    : "—";
  const detRate = effectiveMetrics?.detection_rate != null
    ? fmtPercent(effectiveMetrics.detection_rate)
    : "—";
  const acqTime = effectiveMetrics?.acquisition_time != null
    ? fmtSeconds(effectiveMetrics.acquisition_time)
    : "—";
  const targetLoss = effectiveMetrics?.target_loss_percentage != null
    ? fmtPercent(effectiveMetrics.target_loss_percentage)
    : "—";
  const reacqTime = effectiveMetrics?.reacquisition_time != null
    ? fmtSeconds(effectiveMetrics.reacquisition_time)
    : "—";
  const rawConf = effectiveMetrics?.ai_confidence ?? effectiveMetrics?.detection_confidence;
  const aiConf = rawConf != null ? fmtPercent(rawConf) : "—";
  const aiLatency = effectiveMetrics?.ai_inference_ms != null
    ? `${effectiveMetrics.ai_inference_ms.toFixed(1)} ms`
    : "—";

  const chartData = isCleared ? [] : stream.history;

  return (
    <>
      <PageHeader
        title="Performance Analytics"
        description="Comprehensive quantitative evaluation, tracking error telemetry, and scenario benchmarks."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchMetrics()}
              disabled={loadingMetrics || backend.status !== "CONNECTED"}
            >
              <RefreshCw className={loadingMetrics ? "animate-spin" : ""} /> Refresh metrics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMetrics}
              disabled={isCleared && stream.history.length === 0 && polledMetrics === null}
              title="Clear the current analytics buffer and start with a clean display."
            >
              <Trash2 className="size-3.5 mr-1" /> Clear Metrics
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/tracking">
                <ArrowLeft /> Live tracking
              </Link>
            </Button>
          </div>
        }
      />

      {/* 10 Key Measured Metrics Grid */}
      <Panel
        title="Measured Performance Metrics"
        subtitle="Quantitative tracking performance and statistical evaluation"
        className="mb-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 font-mono text-xs">
          {/* Top Row: 5 metrics */}
          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">FPS</span>
            <span className="text-base font-bold text-sky-400 mt-1 block">{fpsVal}</span>
            <span className="text-[10px] text-muted-foreground">Throughput</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Average Error</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">{avgErr}</span>
            <span className="text-[10px] text-muted-foreground">Centroid Deviation</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">RMS Error</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">{rmsErr}</span>
            <span className="text-[10px] text-muted-foreground">Radial Variance</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Tracking Success</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">{trackingSuccess}</span>
            <span className="text-[10px] text-muted-foreground">&le; 24 px Coarse Lock</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Detection Rate</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">{detRate}</span>
            <span className="text-[10px] text-muted-foreground">Valid Beacon Hits</span>
          </div>

          {/* Second Row: 5 metrics */}
          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Acquisition Time</span>
            <span className="text-base font-bold text-sky-400 mt-1 block">{acqTime}</span>
            <span className="text-[10px] text-muted-foreground">Initial Lock</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Target Loss</span>
            <span className="text-base font-bold text-muted-foreground mt-1 block">{targetLoss}</span>
            <span className="text-[10px] text-muted-foreground">Dropout Time %</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Reacquisition Time</span>
            <span className="text-base font-bold text-sky-400 mt-1 block">{reacqTime}</span>
            <span className="text-[10px] text-muted-foreground">Recovery Latency</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">AI Confidence</span>
            <span className="text-base font-bold text-emerald-400 mt-1 block">{aiConf}</span>
            <span className="text-[10px] text-muted-foreground">Detection Probability</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">AI Inference Latency</span>
            <span className="text-base font-bold text-sky-400 mt-1 block">{aiLatency}</span>
            <span className="text-[10px] text-muted-foreground">Model Execution Time</span>
          </div>
        </div>
      </Panel>

      {/* 5 Clean Charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Chart 1: Tracking Error vs Time with 24 px threshold */}
        <Panel
          title="Tracking Error Over Time"
          subtitle="Centroid offset magnitude with 24 px coarse-lock reference threshold"
        >
          <TimeSeriesChart
            data={chartData}
            zeroLine
            yLabel="px"
            height={240}
            referenceLines={[
              {
                y: 24,
                label: "Coarse Lock Threshold (24 px)",
                color: "#10b981",
                strokeDasharray: "4 4",
              },
            ]}
            series={[
              { key: "error_x", label: "Error X", color: "#f59e0b" },
              { key: "error_y", label: "Error Y", color: "#ec4899" },
              { key: "error_mag", label: "Magnitude |e|", color: "#38bdf8" },
            ]}
            emptyMessage="No tracking error samples recorded yet. Run a simulation to populate chart."
          />
        </Panel>

        {/* Chart 2: FPS vs Time */}
        <Panel
          title="Processing Framerate Stability"
          subtitle="Real-time frames per second throughput consistency"
        >
          <TimeSeriesChart
            data={chartData}
            yLabel="fps"
            height={240}
            series={[{ key: "fps", label: "Framerate", color: "#06b6d4" }]}
            emptyMessage="No framerate samples recorded yet."
          />
        </Panel>

        {/* Chart 3: Pan/Tilt Position */}
        <Panel
          title="Gimbal Position (Pan / Tilt Angles)"
          subtitle="Azimuth (Pan) and Elevation (Tilt) orientation in degrees"
        >
          <TimeSeriesChart
            data={chartData}
            zeroLine
            yLabel="deg"
            height={240}
            referenceLines={[
              { y: 45, label: "+45° Limit", color: "#ef4444", strokeDasharray: "3 3" },
              { y: -45, label: "-45° Limit", color: "#ef4444", strokeDasharray: "3 3" },
            ]}
            series={[
              { key: "pan", label: "Pan Angle", color: "#38bdf8" },
              { key: "tilt", label: "Tilt Angle", color: "#10b981" },
            ]}
            emptyMessage="No gimbal position samples recorded yet."
          />
        </Panel>

        {/* Chart 4: Commanded Motion */}
        <Panel
          title="Commanded Motion (Slew Rates)"
          subtitle="Dual-axis controller commanded angular velocity in degrees per second"
        >
          <TimeSeriesChart
            data={chartData}
            zeroLine
            yLabel="deg/s"
            height={240}
            series={[
              { key: "commanded_pan_deg_s", label: "Cmd Pan Rate", color: "#38bdf8" },
              { key: "commanded_tilt_deg_s", label: "Cmd Tilt Rate", color: "#f59e0b" },
            ]}
            emptyMessage="No commanded motion samples recorded yet."
          />
        </Panel>
      </div>

      {/* Chart 5: Scenario Comparison (Full Width) */}
      <div className="mt-4">
        <Panel
          title="Scenario Comparison (15-Second Measured Benchmarks)"
          subtitle="Average Error (px) and Tracking Success Rate (%) across all 7 operational scenarios"
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={SCENARIO_COMPARISON_DATA}
                margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={tickStyle}
                  stroke="var(--color-border)"
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  tick={tickStyle}
                  stroke="var(--color-border)"
                  label={{
                    value: "Average Error (px)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: tickStyle,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={tickStyle}
                  stroke="var(--color-border)"
                  label={{
                    value: "Tracking Success (%)",
                    angle: 90,
                    position: "insideRight",
                    offset: 10,
                    style: tickStyle,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                  isAnimationActive={false}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    paddingTop: 10,
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="avgError"
                  name="Average Error (px)"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  yAxisId="right"
                  dataKey="successRate"
                  name="Tracking Success Rate (%)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}
