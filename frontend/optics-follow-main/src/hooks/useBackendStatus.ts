import { useCallback, useEffect, useRef, useState } from "react";
import { simulationApi } from "@/api/simulationApi";
import { ApiError } from "@/api/client";
import type { HealthResponse } from "@/types/metrics";
import type { BackendStatus } from "@/utils/status";
import { HEALTH_POLL_INTERVAL_MS } from "@/utils/apiConfig";

export interface BackendStatusState {
  status: BackendStatus;
  health: HealthResponse | null;
  lastChecked: number | null;
  error: string | null;
  checkNow: () => Promise<boolean>;
}

/** Polls GET /api/health. Reports CONNECTED only when the backend truly answers. */
export function useBackendStatus(apiBaseUrl: string): BackendStatusState {
  const [status, setStatus] = useState<BackendStatus>("CHECKING");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const checkNow = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return status === "CONNECTED";
    inFlight.current = true;
    try {
      const res = await simulationApi.health();
      setHealth(res ?? null);
      setStatus("CONNECTED");
      setError(null);
      return true;
    } catch (err) {
      setHealth(null);
      if (err instanceof ApiError && err.kind === "http") {
        setStatus("ERROR");
        setError(err.message);
      } else {
        setStatus("DISCONNECTED");
        setError(err instanceof ApiError ? err.message : "Backend unreachable.");
      }
      return false;
    } finally {
      inFlight.current = false;
      setLastChecked(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setStatus("CHECKING");
    void checkNow();
    const id = setInterval(() => void checkNow(), HEALTH_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkNow, apiBaseUrl]);

  return { status, health, lastChecked, error, checkNow };
}
