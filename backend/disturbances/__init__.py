"""Disturbances package unifying sensor noise, blur, atmosphere, and platform jitter."""

from typing import Tuple
import numpy as np
from backend.models.schemas import DisturbanceConfig
from backend.disturbances.atmosphere import (
    apply_haze_fog,
    apply_illumination,
    apply_rain,
    get_scintillation_factor,
)
from backend.disturbances.blur import apply_defocus_blur, apply_motion_blur
from backend.disturbances.jitter import MountJitter
from backend.disturbances.noise import apply_gaussian_noise, apply_salt_pepper_noise
from backend.disturbances.platform_motion import PlatformMotion


class DisturbanceEngine:
    """Unified engine to apply environmental and mechanical disturbances to sensor frames and gimbal LOS."""

    def __init__(self):
        self.jitter_sim = MountJitter()
        self.platform_sim = PlatformMotion()

    def get_angular_disturbance(
        self, config: DisturbanceConfig, t: float
    ) -> Tuple[float, float]:
        """Compute combined angular line-of-sight perturbation in degrees (pan, tilt)."""
        tot_pan = 0.0
        tot_tilt = 0.0

        if config.camera_jitter.enabled:
            j_pan, j_tilt = self.jitter_sim.get_jitter_offset(
                t, config.camera_jitter.intensity
            )
            tot_pan += j_pan
            tot_tilt += j_tilt

        if config.platform_motion.enabled:
            p_pan, p_tilt = self.platform_sim.get_platform_deflection(
                t, config.platform_motion.intensity
            )
            tot_pan += p_pan
            tot_tilt += p_tilt

        return tot_pan, tot_tilt

    def apply_to_frame(
        self, frame: np.ndarray, config: DisturbanceConfig, t: float
    ) -> np.ndarray:
        """Apply optical channel and sensor disturbances to an acquired frame."""
        out = frame.copy()

        # 1. Atmospheric haze / fog
        if config.haze_fog.enabled:
            out = apply_haze_fog(out, config.haze_fog.intensity)

        # 2. Rain precipitation streaks
        if config.rain.enabled:
            out = apply_rain(out, config.rain.intensity)

        # 3. Ambient illumination, contrast, low light
        b_int = config.brightness_variation.intensity if config.brightness_variation.enabled else 0.0
        c_int = config.contrast_variation.intensity if config.contrast_variation.enabled else 0.0
        ll_int = config.low_light.intensity if config.low_light.enabled else 0.0

        if b_int > 0.0 or c_int > 0.0 or ll_int > 0.0:
            out = apply_illumination(out, b_int, c_int, ll_int)

        # 4. Optical defocus blur & motion smear
        if config.motion_blur.enabled:
            out = apply_motion_blur(out, config.motion_blur.intensity)

        # 5. Sensor electronic noise
        if config.gaussian_noise.enabled:
            out = apply_gaussian_noise(out, config.gaussian_noise.intensity)

        if config.salt_pepper_noise.enabled:
            out = apply_salt_pepper_noise(out, config.salt_pepper_noise.intensity)

        return out
