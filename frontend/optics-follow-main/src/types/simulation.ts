/** Types shared with the backend — keep in sync with the API contract. */

export type Trajectory = "straight" | "circular" | "figure8" | "random";

export const TRAJECTORY_OPTIONS: { value: Trajectory; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "circular", label: "Circular" },
  { value: "figure8", label: "Figure-8" },
  { value: "random", label: "Random" },
];

export type SimulationStatus =
  | "IDLE"
  | "INITIALIZING"
  | "SEARCHING"
  | "ACQUIRING"
  | "TRACKING"
  | "TARGET_LOST"
  | "RE-ACQUIRING"
  | "TRACKING_LOCKED"
  | "PAUSED"
  | "STOPPED";

export interface ScreenConfig {
  width: number;
  height: number;
}

export interface CameraConfig {
  width: number;
  height: number;
  horizontal_fov: number;
  vertical_fov: number;
  max_pan_speed: number;
  max_tilt_speed: number;
  jitter_x: number;
  jitter_y: number;
  min_pan?: number;
  max_pan?: number;
  min_tilt?: number;
  max_tilt?: number;
}

export type DetectorMode = "AI" | "HYBRID" | "OPENCV";

export const DETECTOR_MODE_OPTIONS: { value: DetectorMode; label: string; description: string }[] = [
  { value: "AI", label: "AI (PyTorch CNN)", description: "Direct neural network forward inference" },
  { value: "HYBRID", label: "Hybrid (AI + Subpixel CV)", description: "CNN detection fused with optical flux centroiding" },
  { value: "OPENCV", label: "Classical OpenCV", description: "Morphology + intensity-weighted contour detection" },
];

export interface TargetConfig {
  beacon_size: number;
  speed: number;
  trajectory: Trajectory;
  count: number;
  designated_id: number;
  detector_mode?: DetectorMode;
}

export interface PIDGains {
  kp: number;
  ki: number;
  kd: number;
}

export interface PIDConfig {
  pan: PIDGains;
  tilt: PIDGains;
}

export interface DisturbanceSetting {
  enabled: boolean;
  /** 0 – 1 normalised intensity. Ignored by disturbances without intensity. */
  intensity: number;
}

export type DisturbanceKey =
  | "gaussian_noise"
  | "salt_pepper_noise"
  | "motion_blur"
  | "brightness_variation"
  | "contrast_variation"
  | "low_light"
  | "haze_fog"
  | "rain"
  | "camera_jitter"
  | "platform_motion";

export type DisturbanceConfig = Record<DisturbanceKey, DisturbanceSetting>;

export interface SimulationConfig {
  screen: ScreenConfig;
  camera: CameraConfig;
  target: TargetConfig;
  disturbances: DisturbanceConfig;
  pid: PIDConfig;
}

/** Response of GET /api/simulation/status */
export interface SimulationStatusResponse {
  status: SimulationStatus;
  running?: boolean;
  paused?: boolean;
  frame_id?: number;
  elapsed_time?: number;
  message?: string;
  config?: Partial<SimulationConfig>;
}

/** Generic acknowledgement returned by the control endpoints. */
export interface SimulationActionResponse {
  success?: boolean;
  status?: SimulationStatus;
  message?: string;
}

export type SimulationAction = "start" | "pause" | "resume" | "stop" | "reset";
