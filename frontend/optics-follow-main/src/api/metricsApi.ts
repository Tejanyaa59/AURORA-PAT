import { apiClient } from "./client";
import type { PerformanceMetrics, Report } from "@/types/metrics";

export const metricsApi = {
  getMetrics: (signal?: AbortSignal) => apiClient.get<PerformanceMetrics>("/metrics", { signal }),
  getReport: (signal?: AbortSignal) =>
    apiClient.get<Report>("/report", { signal, timeoutMs: 15000 }),
};
