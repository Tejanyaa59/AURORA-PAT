export type VideoProcessingState =
  "IDLE" | "UPLOADED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface VideoUploadResponse {
  success?: boolean;
  video_id?: string;
  video_name?: string;
  message?: string;
}

export interface VideoResults {
  detection_rate?: number;
  tracking_success_percentage?: number;
  average_error?: number;
  maximum_error?: number;
  rms_error?: number;
  target_loss_percentage?: number;
  reacquisition_time?: number;
  acquisition_time?: number;
}

/** Response of GET /api/video/status */
export interface VideoStatus {
  video_id?: string;
  video_name?: string;
  status: VideoProcessingState;
  fps?: number;
  frames_processed?: number;
  total_frames?: number;
  progress?: number; // 0 – 100
  message?: string;
  results?: VideoResults;
}
