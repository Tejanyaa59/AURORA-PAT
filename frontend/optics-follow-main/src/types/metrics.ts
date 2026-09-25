import type { DisturbanceConfig, PIDConfig, SimulationConfig, TargetConfig } from "./simulation";

/** Response of GET /api/metrics */
export interface PerformanceMetrics {
  fps?: number;
  acquisition_time?: number;
  average_error?: number;
  maximum_error?: number;
  rms_error?: number;
  target_loss_percentage?: number;
  reacquisition_time?: number;
  tracking_success_percentage?: number;
  detection_confidence?: number;
  detection_rate?: number;
  frames_processed?: number;
  target_loss_events?: number;
  detector_mode?: string;
  ai_confidence?: number;
  ai_inference_ms?: number;
}

export interface ReportResults extends PerformanceMetrics {
  duration?: number;
}

/** Response of GET /api/report */
export interface Report {
  experiment_id?: string;
  timestamp?: string | number;
  simulation_config?: Partial<SimulationConfig>;
  target_config?: Partial<TargetConfig>;
  disturbances?: Partial<DisturbanceConfig>;
  pid?: Partial<PIDConfig>;
  tracking_algorithm?: string;
  results?: ReportResults;
  notes?: string;
}

export interface HealthResponse {
  status?: string;
  version?: string;
  uptime?: number;
  message?: string;
}
