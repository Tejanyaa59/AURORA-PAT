import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SimulationStatus } from "@/types/simulation";
import { getApiBaseUrl, getTrackingWebSocketUrl, setStoredApiBaseUrl } from "@/utils/apiConfig";
import { normalizeStatus } from "@/utils/status";
import { useBackendStatus, type BackendStatusState } from "./useBackendStatus";
import { useSimulation, type SimulationControlState } from "./useSimulation";
import { useSimulationConfig, type SimulationConfigState } from "./useSimulationConfig";
import { useTrackingWebSocket, type TrackingStreamState } from "./useTrackingWebSocket";

export interface AppState {
  apiBaseUrl: string;
  wsUrl: string;
  setApiBaseUrl: (url: string | null) => void;
  backend: BackendStatusState;
  stream: TrackingStreamState;
  simulation: SimulationControlState;
  configState: SimulationConfigState;
  /** Effective simulation status: live stream if fresh, otherwise REST status. */
  simulationStatus: SimulationStatus;
  /** Where the effective status came from. */
  statusSource: "stream" | "rest" | "none";
  liveFps: number | null;
  hydrated: boolean;
}

const AppStateContext = createContext<AppState | null>(null);

const STREAM_FRESH_MS = 3000;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getApiBaseUrl());
  const [wsUrl, setWsUrl] = useState<string>(getTrackingWebSocketUrl());

  useEffect(() => {
    // Pick up any runtime override once we're in the browser.
    setApiBaseUrlState(getApiBaseUrl());
    setWsUrl(getTrackingWebSocketUrl());
    setHydrated(true);
  }, []);

  const setApiBaseUrl = useCallback((url: string | null) => {
    setStoredApiBaseUrl(url);
    setApiBaseUrlState(getApiBaseUrl());
    setWsUrl(getTrackingWebSocketUrl());
  }, []);

  const backend = useBackendStatus(apiBaseUrl);
  const backendConnected = backend.status === "CONNECTED";
  const stream = useTrackingWebSocket(wsUrl, hydrated);
  const simulation = useSimulation(backendConnected, apiBaseUrl);
  const configState = useSimulationConfig();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { simulationStatus, statusSource } = useMemo(() => {
    const streamFresh =
      stream.wsStatus === "CONNECTED" &&
      stream.latest &&
      stream.lastMessageAt !== null &&
      now - stream.lastMessageAt < STREAM_FRESH_MS;
    if (streamFresh && stream.latest) {
      return {
        simulationStatus: normalizeStatus(stream.latest.status),
        statusSource: "stream" as const,
      };
    }
    if (simulation.restStatus) {
      return { simulationStatus: simulation.restStatus, statusSource: "rest" as const };
    }
    return { simulationStatus: "IDLE" as SimulationStatus, statusSource: "none" as const };
  }, [stream.wsStatus, stream.latest, stream.lastMessageAt, simulation.restStatus, now]);

  const liveFps = statusSource === "stream" ? (stream.latest?.performance?.fps ?? null) : null;

  const value = useMemo<AppState>(
    () => ({
      apiBaseUrl,
      wsUrl,
      setApiBaseUrl,
      backend,
      stream,
      simulation,
      configState,
      simulationStatus,
      statusSource,
      liveFps,
      hydrated,
    }),
    [
      apiBaseUrl,
      wsUrl,
      setApiBaseUrl,
      backend,
      stream,
      simulation,
      configState,
      simulationStatus,
      statusSource,
      liveFps,
      hydrated,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
