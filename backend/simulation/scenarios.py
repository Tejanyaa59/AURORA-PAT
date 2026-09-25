"""Predefined demo scenarios for FSOC coarse tracking validation."""

from typing import Dict, List, Optional
from backend.models.schemas import (
    CameraConfig,
    DisturbanceConfig,
    DisturbanceSetting,
    PIDConfig,
    PIDGains,
    ScreenConfig,
    SimulationConfig,
    TargetConfig,
    TrajectoryEnum,
)


def get_predefined_scenarios() -> Dict[str, Dict]:
    """Return dictionary of 7 predefined demonstration scenarios."""
    scenarios = {
        "scenario_1": {
            "id": "scenario_1",
            "name": "Scenario 1: Normal Tracking",
            "description": "Baseline nominal tracking of a mobile optical beacon with standard circular trajectory and nominal PID response.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=90.0,
                    max_tilt_speed=90.0,
                ),
                target=TargetConfig(
                    beacon_size=12.0,
                    speed=40.0,
                    trajectory=TrajectoryEnum.circular,
                    count=1,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(),
                pid=PIDConfig(
                    pan=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                    tilt=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                ),
            ),
        },
        "scenario_2": {
            "id": "scenario_2",
            "name": "Scenario 2: Fast Target",
            "description": "High-velocity tactical aerial target executing dynamic Figure-8 maneuvers requiring aggressive gimbal slew rates.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=180.0,
                    max_tilt_speed=150.0,
                ),
                target=TargetConfig(
                    beacon_size=12.0,
                    speed=130.0,
                    trajectory=TrajectoryEnum.figure8,
                    count=1,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(),
                pid=PIDConfig(
                    pan=PIDGains(kp=2.2, ki=1.0, kd=0.20),
                    tilt=PIDGains(kp=2.0, ki=1.0, kd=0.20),
                ),
            ),
        },
        "scenario_3": {
            "id": "scenario_3",
            "name": "Scenario 3: High Camera Jitter",
            "description": "Simulates structural motor vibrations and platform angular deflection from marine naval waves or mobile rover chassis.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=90.0,
                    max_tilt_speed=90.0,
                ),
                target=TargetConfig(
                    beacon_size=14.0,
                    speed=40.0,
                    trajectory=TrajectoryEnum.circular,
                    count=1,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(
                    camera_jitter=DisturbanceSetting(enabled=True, intensity=0.65),
                    platform_motion=DisturbanceSetting(enabled=True, intensity=0.55),
                ),
                pid=PIDConfig(
                    pan=PIDGains(kp=1.6, ki=0.6, kd=0.25),
                    tilt=PIDGains(kp=1.6, ki=0.6, kd=0.25),
                ),
            ),
        },
        "scenario_4": {
            "id": "scenario_4",
            "name": "Scenario 4: Low Visibility",
            "description": "Atmospheric haze, dense fog aerosol scattering, and low-light optical channel attenuation challenging detection SNR.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=90.0,
                    max_tilt_speed=90.0,
                ),
                target=TargetConfig(
                    beacon_size=15.0,
                    speed=35.0,
                    trajectory=TrajectoryEnum.circular,
                    count=1,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(
                    haze_fog=DisturbanceSetting(enabled=True, intensity=0.75),
                    low_light=DisturbanceSetting(enabled=True, intensity=0.60),
                    contrast_variation=DisturbanceSetting(enabled=True, intensity=0.50),
                ),
                pid=PIDConfig(
                    pan=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                    tilt=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                ),
            ),
        },
        "scenario_5": {
            "id": "scenario_5",
            "name": "Scenario 5: Noise + Blur",
            "description": "Heavy sensor read noise, impulse salt-and-pepper bad pixels, and directional optical motion smear.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=90.0,
                    max_tilt_speed=90.0,
                ),
                target=TargetConfig(
                    beacon_size=14.0,
                    speed=45.0,
                    trajectory=TrajectoryEnum.circular,
                    count=1,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(
                    gaussian_noise=DisturbanceSetting(enabled=True, intensity=0.55),
                    salt_pepper_noise=DisturbanceSetting(enabled=True, intensity=0.35),
                    motion_blur=DisturbanceSetting(enabled=True, intensity=0.65),
                ),
                pid=PIDConfig(
                    pan=PIDGains(kp=1.8, ki=0.8, kd=0.18),
                    tilt=PIDGains(kp=1.8, ki=0.8, kd=0.18),
                ),
            ),
        },
        "scenario_6": {
            "id": "scenario_6",
            "name": "Scenario 6: Target Loss & Reacquisition",
            "description": "Momentary beam obscuration causing tracking dropout, demonstrating 4D Kalman filter coasting and automatic reacquisition.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=90.0,
                    max_tilt_speed=90.0,
                ),
                target=TargetConfig(
                    beacon_size=12.0,
                    speed=45.0,
                    trajectory=TrajectoryEnum.straight,
                    count=1,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(
                    brightness_variation=DisturbanceSetting(enabled=True, intensity=0.85),
                    haze_fog=DisturbanceSetting(enabled=True, intensity=0.70),
                ),
                pid=PIDConfig(
                    pan=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                    tilt=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                ),
            ),
        },
        "scenario_7": {
            "id": "scenario_7",
            "name": "Scenario 7: Multiple Targets",
            "description": "Multi-terminal formation with 4 optical beacons; verifies GNN data association locks onto designated beacon without jumping.",
            "config": SimulationConfig(
                screen=ScreenConfig(width=1280, height=720),
                camera=CameraConfig(
                    width=640,
                    height=480,
                    horizontal_fov=60.0,
                    vertical_fov=45.0,
                    max_pan_speed=90.0,
                    max_tilt_speed=90.0,
                ),
                target=TargetConfig(
                    beacon_size=12.0,
                    speed=45.0,
                    trajectory=TrajectoryEnum.circular,
                    count=4,
                    designated_id=1,
                ),
                disturbances=DisturbanceConfig(),
                pid=PIDConfig(
                    pan=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                    tilt=PIDGains(kp=1.8, ki=0.8, kd=0.15),
                ),
            ),
        },
    }
    return scenarios
