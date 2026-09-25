import type { DisturbanceConfig, DisturbanceKey, SimulationConfig } from "@/types/simulation";

export const DISTURBANCE_DEFS: {
  key: DisturbanceKey;
  label: string;
  hasIntensity: boolean;
  description: string;
}[] = [
  {
    key: "gaussian_noise",
    label: "Gaussian Noise",
    hasIntensity: true,
    description: "Additive sensor noise",
  },
  {
    key: "salt_pepper_noise",
    label: "Salt & Pepper Noise",
    hasIntensity: true,
    description: "Impulse pixel noise",
  },
  {
    key: "motion_blur",
    label: "Motion Blur",
    hasIntensity: true,
    description: "Directional smear",
  },
  {
    key: "brightness_variation",
    label: "Brightness Variation",
    hasIntensity: true,
    description: "Time-varying exposure",
  },
  {
    key: "contrast_variation",
    label: "Contrast Variation",
    hasIntensity: true,
    description: "Dynamic range change",
  },
  { key: "low_light", label: "Low Light", hasIntensity: true, description: "Reduced illumination" },
  {
    key: "haze_fog",
    label: "Haze / Fog",
    hasIntensity: true,
    description: "Atmospheric scattering",
  },
  { key: "rain", label: "Rain", hasIntensity: true, description: "Precipitation streaks" },
  {
    key: "camera_jitter",
    label: "Camera Jitter",
    hasIntensity: true,
    description: "High-frequency vibration",
  },
  {
    key: "platform_motion",
    label: "Platform Motion",
    hasIntensity: true,
    description: "Low-frequency base motion",
  },
];

export const DEFAULT_DISTURBANCES: DisturbanceConfig = DISTURBANCE_DEFS.reduce((acc, d) => {
  acc[d.key] = { enabled: false, intensity: 0.3 };
  return acc;
}, {} as DisturbanceConfig);

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  screen: { width: 1280, height: 720 },
  camera: {
    width: 640,
    height: 480,
    horizontal_fov: 60,
    vertical_fov: 45,
    max_pan_speed: 90,
    max_tilt_speed: 90,
    min_pan: -45,
    max_pan: 45,
    min_tilt: -45,
    max_tilt: 45,
    jitter_x: 0,
    jitter_y: 0,
  },
  target: {
    beacon_size: 12,
    speed: 40,
    trajectory: "circular",
    count: 1,
    designated_id: 1,
    detector_mode: "AI",
  },
  disturbances: DEFAULT_DISTURBANCES,
  pid: {
    pan: { kp: 1.8, ki: 0.8, kd: 0.15 },
    tilt: { kp: 1.8, ki: 0.8, kd: 0.15 },
  },
};

export const CONFIG_STORAGE_KEY = "fsoc.simulationConfig";
