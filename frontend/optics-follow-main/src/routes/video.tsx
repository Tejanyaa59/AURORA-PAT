import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Film, Loader2, RefreshCw, Upload, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { describeError } from "@/api/client";
import { videoApi } from "@/api/videoApi";
import { KeyValue, PageHeader, Panel } from "@/components/layout/Panel";
import { MetricCard } from "@/components/metrics/MetricCard";
import { StatusPill } from "@/components/layout/StatusPill";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppState } from "@/hooks/appState";
import type { VideoStatus } from "@/types/video";
import { fmt, fmtPercent, fmtSeconds } from "@/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/video")({
  head: () => ({
    meta: [
      { title: "Video Benchmarking — FSOC Virtual Camera" },
      {
        name: "description",
        content: "Benchmark recorded FSOC terminal videos against AI beacon tracking algorithms.",
      },
      { property: "og:title", content: "Video Benchmarking — FSOC Virtual Camera" },
      {
        property: "og:description",
        content: "Upload test recordings and evaluate coarse alignment performance.",
      },
    ],
  }),
  component: VideoBenchmarkPage,
});

export function VideoBenchmarkPage() {
  const { backend } = useAppState();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusData, setStatusData] = useState<VideoStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await videoApi.status();
      if (res) {
        setStatusData(res);
        setStatusError(null);
      }
    } catch (err) {
      setStatusError(describeError(err));
    }
  }, []);

  // Poll video status while processing or queued
  useEffect(() => {
    if (backend.status !== "CONNECTED") return;
    void pollStatus();

    const isWorking =
      statusData?.status === "PROCESSING" ||
      statusData?.status === "QUEUED" ||
      statusData?.status === "UPLOADED";
    if (!isWorking) return;

    const timer = setInterval(() => void pollStatus(), 2000);
    return () => clearInterval(timer);
  }, [backend.status, pollStatus, statusData?.status]);

  const handleFileSelect = (file: File) => {
    if (!file.type.includes("video") && !file.name.match(/\.(mp4|avi|mov|mkv)$/i)) {
      toast.error("Invalid file format", {
        description: "Please upload an MP4, AVI, or MOV video file.",
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (backend.status !== "CONNECTED") {
      toast.error("Backend offline", {
        description: "Cannot upload video while backend server is offline.",
      });
      return;
    }
    setUploading(true);
    try {
      const res = await videoApi.upload(selectedFile);
      toast.success("Video uploaded successfully", {
        description: res?.message ?? `Processing ${selectedFile.name}...`,
      });
      await pollStatus();
    } catch (err) {
      toast.error("Upload failed", { description: describeError(err) });
    } finally {
      setUploading(false);
    }
  };

  const processingState = statusData?.status ?? "IDLE";
  const progressPercent = statusData?.progress ?? (processingState === "COMPLETED" ? 100 : 0);
  const results = statusData?.results;

  return (
    <>
      <PageHeader
        title="Video Benchmarking"
        description="Evaluate beacon tracking accuracy and reacquisition against recorded optical terminal videos."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill
              tone={backend.status === "CONNECTED" ? "success" : "muted"}
              label={backend.status === "CONNECTED" ? "BACKEND READY" : "BACKEND OFFLINE"}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void pollStatus()}
              disabled={backend.status !== "CONNECTED"}
            >
              <RefreshCw className="size-3.5" /> Refresh status
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          {/* Upload Zone */}
          <Panel
            title="Upload benchmark recording"
            subtitle="Evaluate recorded optical beacon footage against tracking algorithms"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-secondary/20",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/x-m4v,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <div className="size-12 rounded-full bg-primary/10 border border-primary/30 grid place-items-center mb-3">
                <Upload className="size-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Drag & drop MP4 video here, or browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click or drag to change`
                  : "Supports MP4, AVI, MOV recordings of optical beacons"}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {backend.status !== "CONNECTED"
                  ? "Backend offline — connect to backend server to process benchmark recordings."
                  : selectedFile
                    ? "Ready to upload to backend."
                    : "No file selected."}
              </span>
              <Button
                disabled={!selectedFile || uploading || backend.status !== "CONNECTED"}
                onClick={handleUpload}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Video />}
                {uploading ? "Uploading..." : "Upload & Benchmark"}
              </Button>
            </div>
          </Panel>

          {/* Processing Status & Progress */}
          <Panel title="Benchmark processing status" subtitle="Backend tracking execution progress">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {processingState === "PROCESSING" && (
                    <Loader2 className="size-4 animate-spin text-info" />
                  )}
                  {processingState === "COMPLETED" && (
                    <CheckCircle2 className="size-4 text-success" />
                  )}
                  {processingState === "FAILED" && <AlertCircle className="size-4 text-danger" />}
                  {processingState === "IDLE" && <Film className="size-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">Status: {processingState}</span>
                </div>
                <span className="numeric text-sm text-muted-foreground">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>

              <Progress value={progressPercent} className="h-2" />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs pt-1">
                <div>
                  <span className="label-tech text-[10px]">Video ID</span>
                  <p className="numeric truncate">{statusData?.video_id ?? "—"}</p>
                </div>
                <div>
                  <span className="label-tech text-[10px]">Frames processed</span>
                  <p className="numeric">
                    {statusData?.frames_processed !== undefined
                      ? `${statusData.frames_processed} ${statusData.total_frames ? `/ ${statusData.total_frames}` : ""}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="label-tech text-[10px]">Processing FPS</span>
                  <p className="numeric">{fmt(statusData?.fps, 1)}</p>
                </div>
                <div>
                  <span className="label-tech text-[10px]">Video name</span>
                  <p className="truncate">{statusData?.video_name ?? selectedFile?.name ?? "—"}</p>
                </div>
              </div>

              {statusError && <p className="text-xs text-danger">{statusError}</p>}
              {statusData?.message && (
                <p className="text-xs text-muted-foreground">{statusData.message}</p>
              )}
            </div>
          </Panel>

          {/* Benchmark Results */}
          <Panel
            title="Benchmark evaluation results"
            subtitle="Quantitative metrics computed by the optical tracking pipeline"
          >
            {!results ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                {processingState === "PROCESSING"
                  ? "Processing video stream on the backend... results will display when completed."
                  : "No benchmark results yet. Upload a video recording to evaluate algorithm performance."}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Detection rate"
                  value={fmtPercent(results.detection_rate)}
                  tone="success"
                  hint="Frames target was detected"
                />
                <MetricCard
                  label="Tracking success"
                  value={fmtPercent(results.tracking_success_percentage)}
                  tone={
                    (results.tracking_success_percentage ?? 0) > 90
                      ? "success"
                      : (results.tracking_success_percentage ?? 0) > 75
                        ? "warning"
                        : "danger"
                  }
                  hint="Within coarse alignment envelope"
                />
                <MetricCard
                  label="Average error"
                  value={fmt(results.average_error, 2)}
                  unit="px"
                  hint="Mean deviation from reticle"
                />
                <MetricCard
                  label="Reacquisition time"
                  value={fmtSeconds(results.reacquisition_time)}
                  hint="Mean time to recover track"
                />
                <MetricCard
                  label="RMS error"
                  value={fmt(results.rms_error, 2)}
                  unit="px"
                  hint="Root mean square error"
                />
                <MetricCard
                  label="Max error"
                  value={fmt(results.maximum_error, 2)}
                  unit="px"
                  hint="Peak deviation recorded"
                />
                <MetricCard
                  label="Target loss"
                  value={fmtPercent(results.target_loss_percentage)}
                  tone={(results.target_loss_percentage ?? 0) > 5 ? "danger" : "success"}
                  hint="Percentage of lost frames"
                />
                <MetricCard
                  label="Acquisition time"
                  value={fmtSeconds(results.acquisition_time)}
                  hint="Initial beacon lock duration"
                />
              </div>
            )}
          </Panel>
        </div>

        {/* Diagnostic Sidebar */}
        <div className="flex flex-col gap-4 min-w-0">
          <Panel title="Benchmark protocol" subtitle="Methodology">
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>Automated analysis:</strong> Video frames are ingested and evaluated
                against optical beacon detection and predictive tracking filters.
              </p>
              <p>
                <strong>Evaluation criteria:</strong> Tracking success is measured as the percentage
                of frames where optical beacon centroid remains within the virtual sensor's coarse
                alignment acceptance circle.
              </p>
              <p>
                <strong>Reacquisition benchmark:</strong> Validates predictive filter tracking
                through simulated line-of-sight dropouts and physical obstruction.
              </p>
            </div>
          </Panel>

          <Panel title="Video specifications" subtitle="Acceptance standards">
            <KeyValue label="Supported containers" value="MP4, AVI, MOV" mono={false} />
            <KeyValue label="Optimal resolution" value="640×480 or 1280×720" mono={false} />
            <KeyValue label="Framerate target" value="30 or 60 FPS" mono={false} />
            <KeyValue label="Backend endpoint" value="/api/video/upload" mono={false} />
            <KeyValue label="Status endpoint" value="/api/video/status" mono={false} />
          </Panel>
        </div>
      </div>
    </>
  );
}
