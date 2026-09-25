import { useCallback, useEffect, useState } from "react";
import type { SimulationConfig } from "@/types/simulation";
import { CONFIG_STORAGE_KEY, DEFAULT_SIMULATION_CONFIG } from "@/utils/defaultConfig";

export interface SimulationConfigState {
  config: SimulationConfig;
  update: (patch: (prev: SimulationConfig) => SimulationConfig) => void;
  resetToDefaults: () => void;
  hydrated: boolean;
}

function mergeConfig(stored: unknown): SimulationConfig {
  if (!stored || typeof stored !== "object") return DEFAULT_SIMULATION_CONFIG;
  const s = stored as Partial<SimulationConfig>;
  // Auto-upgrade if stale PID gains (< 1.0) exist from previous un-tuned session
  const panKp = s.pid?.pan?.kp ?? DEFAULT_SIMULATION_CONFIG.pid.pan.kp;
  const tiltKp = s.pid?.tilt?.kp ?? DEFAULT_SIMULATION_CONFIG.pid.tilt.kp;
  const panGains = panKp < 1.0 ? DEFAULT_SIMULATION_CONFIG.pid.pan : { ...DEFAULT_SIMULATION_CONFIG.pid.pan, ...s.pid?.pan };
  const tiltGains = tiltKp < 1.0 ? DEFAULT_SIMULATION_CONFIG.pid.tilt : { ...DEFAULT_SIMULATION_CONFIG.pid.tilt, ...s.pid?.tilt };
  return {
    screen: { ...DEFAULT_SIMULATION_CONFIG.screen, ...s.screen },
    camera: { ...DEFAULT_SIMULATION_CONFIG.camera, ...s.camera },
    target: { ...DEFAULT_SIMULATION_CONFIG.target, ...s.target },
    disturbances: { ...DEFAULT_SIMULATION_CONFIG.disturbances, ...s.disturbances },
    pid: {
      pan: panGains,
      tilt: tiltGains,
    },
  };
}

/** Draft configuration edited across pages; persisted locally, sent to backend on Apply. */
export function useSimulationConfig(): SimulationConfigState {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) setConfig(mergeConfig(JSON.parse(raw)));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* storage unavailable */
    }
  }, [config, hydrated]);

  const update = useCallback((patch: (prev: SimulationConfig) => SimulationConfig) => {
    setConfig((prev) => patch(prev));
  }, []);

  const resetToDefaults = useCallback(() => setConfig(DEFAULT_SIMULATION_CONFIG), []);

  return { config, update, resetToDefaults, hydrated };
}
