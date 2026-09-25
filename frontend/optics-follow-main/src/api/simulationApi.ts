import { apiClient } from "./client";
import type { HealthResponse } from "@/types/metrics";
import type {
  SimulationAction,
  SimulationActionResponse,
  SimulationConfig,
  SimulationStatusResponse,
} from "@/types/simulation";

export const simulationApi = {
  health: (signal?: AbortSignal) =>
    apiClient.get<HealthResponse>("/health", { signal, timeoutMs: 4000 }),

  configure: (config: SimulationConfig) =>
    apiClient.post<SimulationActionResponse>("/simulation/configure", config),

  start: () => apiClient.post<SimulationActionResponse>("/simulation/start"),
  pause: () => apiClient.post<SimulationActionResponse>("/simulation/pause"),
  resume: () => apiClient.post<SimulationActionResponse>("/simulation/resume"),
  stop: () => apiClient.post<SimulationActionResponse>("/simulation/stop"),
  reset: () => apiClient.post<SimulationActionResponse>("/simulation/reset"),

  action: (action: SimulationAction) =>
    apiClient.post<SimulationActionResponse>(`/simulation/${action}`),

  status: (signal?: AbortSignal) =>
    apiClient.get<SimulationStatusResponse>("/simulation/status", { signal }),
};
