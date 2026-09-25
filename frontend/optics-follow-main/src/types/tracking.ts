import type { SimulationStatus } from "./simulation";

export type TrackingState = Exclude<SimulationStatus, "IDLE" | "STOPPED" | "PAUSED">;

export interface Target {
  id: number;
  x: number;
  y: number;
  predicted_x?: number;
  predicted_y?: number;
  confidence?: number;
  detected?: boolean;
  designated?: boolean;
  /** Optional 1-sigma uncertainty radius in pixels (from the Kalman filter). */
  uncertainty?: number;
  velocity_x?: number;
  velocity_y?: number;
  kalman_state?: string;
}

export interface CameraCenter {
  x: number;
  y: number;
}

export interface TrackingError {
  x: number;
  y: number;
  magnitude: number;
}

export interface CameraState {
  pan: number;
  tilt: number;
  pan_speed?: number;
  tilt_speed?: number;
  commanded_pan_deg_s?: number;
  commanded_tilt_deg_s?: number;
  actual_pan_deg?: number;
  actual_tilt_deg?: number;
  min_pan_deg?: number;
  max_pan_deg?: number;
  min_tilt_deg?: number;
  max_tilt_deg?: number;
}

export interface PerformanceSnapshot {
  fps?: number;
  average_error?: number;
  maximum_error?: number;
  rms_error?: number;
  target_loss_percentage?: number;
  acquisition_time?: number;
  reacquisition_time?: number;
  tracking_success_percentage?: number;
  detection_confidence?: number;
  detection_rate?: number;
  detector_mode?: string;
  ai_confidence?: number;
  ai_inference_ms?: number;
}

export interface FrameInfo {
  width?: number;
  height?: number;
}

/** Message received over /ws/tracking */
export interface TrackingUpdate {
  frame_id: number;
  timestamp: number;
  status: SimulationStatus;
  target_detected: boolean;
  target?: Target | null;
  targets?: Target[];
  designated_target_id?: number;
  camera_center?: CameraCenter;
  error?: TrackingError | null;
  camera?: CameraState;
  performance?: PerformanceSnapshot;
  /** Base64 JPEG (with or without data-URI prefix). */
  frame?: string | null;
  frame_info?: FrameInfo;
  confidence?: number;
  detector_mode?: string;
  ai_confidence?: number;
  ai_inference_ms?: number;
  error_x_px?: number;
  error_y_px?: number;
  commanded_pan_deg_s?: number;
  commanded_tilt_deg_s?: number;
  actual_pan_deg?: number;
  actual_tilt_deg?: number;
  velocity_x?: number;
  velocity_y?: number;
  kalman_state?: string;
  min_pan_deg?: number;
  max_pan_deg?: number;
  min_tilt_deg?: number;
  max_tilt_deg?: number;
  message?: string;
}

export type WebSocketStatus =
  "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "ERROR";

/** One row of the in-memory history used by charts. */
export interface TrackingSample {
  frame_id: number;
  timestamp: number;
  t: number; // seconds since first sample
  status: SimulationStatus;
  error_x: number | null;
  error_y: number | null;
  error_mag: number | null;
  fps: number | null;
  pan: number | null;
  tilt: number | null;
  commanded_pan_deg_s?: number | null;
  commanded_tilt_deg_s?: number | null;
  actual_pan?: number | null;
  actual_tilt?: number | null;
  confidence: number | null;
  target_detected: boolean;
  kalman_state?: string | null;
}
