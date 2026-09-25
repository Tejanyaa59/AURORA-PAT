import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { simulationApi } from "@/api/simulationApi";
import { describeError } from "@/api/client";
import type {
  SimulationAction,
  SimulationConfig,
  SimulationStatus,
  SimulationStatusResponse,
} from "@/types/simulation";
import { STATUS_POLL_INTERVAL_MS } from "@/utils/apiConfig";
import { normalizeStatus } from "@/utils/status";

export interface SimulationControlState {
  /** Latest status returned by GET /api/simulation/status (null if never fetched). */
  statusResponse: SimulationStatusResponse | null;
  restStatus: SimulationStatus | null;
  statusError: string | null;
  busyAction: SimulationAction | "configure" | null;
  refreshStatus: () => Promise<void>;
  runAction: (action: SimulationAction) => Promise<boolean>;
  applyConfig: (config: SimulationConfig) => Promise<boolean>;
}

const ACTION_LABEL: Record<SimulationAction, string> = {
  start: "Simulation started",
  pause: "Simulation paused",
  resume: "Simulation resumed",
  stop: "Simulation stopped",
  reset: "Simulation reset",
};

/** REST-side simulation control. Backend is the source of truth for state. */
export function useSimulation(
  backendConnected: boolean,
  apiBaseUrl: string,
): SimulationControlState {
  const [statusResponse, setStatusResponse] = useState<SimulationStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<SimulationAction | "configure" | null>(null);
  const inFlight = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await simulationApi.status();
      setStatusResponse(res ?? null);
      setStatusError(null);
    } catch (err) {
      setStatusError(describeError(err, "Could not read simulation status."));
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!backendConnected) {
      setStatusResponse(null);
      return;
    }
    void refreshStatus();
    const id = setInterval(() => void refreshStatus(), STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [backendConnected, refreshStatus, apiBaseUrl]);

  const runAction = useCallback(
    async (action: SimulationAction): Promise<boolean> => {
      setBusyAction(action);
      try {
        const res = await simulationApi.action(action);
        toast.success(ACTION_LABEL[action], { description: res?.message });
        await refreshStatus();
        return true;
      } catch (err) {
        toast.error(`Could not ${action} simulation`, { description: describeError(err) });
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [refreshStatus],
  );

  const applyConfig = useCallback(
    async (config: SimulationConfig): Promise<boolean> => {
      setBusyAction("configure");
      try {
        const res = await simulationApi.configure(config);
        toast.success("Configuration applied", { description: res?.message });
        await refreshStatus();
        return true;
      } catch (err) {
        toast.error("Configuration rejected", { description: describeError(err) });
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [refreshStatus],
  );

  return {
    statusResponse,
    restStatus: statusResponse ? normalizeStatus(statusResponse.status) : null,
    statusError,
    busyAction,
    refreshStatus,
    runAction,
    applyConfig,
  };
}
