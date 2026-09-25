"""Platform motion disturbance modeling base sway, vehicle roll, and naval waves."""

import math
from typing import Tuple


class PlatformMotion:
    """Simulates dynamic base rotation of mobile terminal platforms (ships, UAVs, rovers)."""

    def __init__(self):
        # Dominant platform motion frequencies (0.15 - 0.6 Hz typical for naval/aerial sway)
        self.freq_yaw = 0.22
        self.freq_pitch = 0.35
        self.freq_roll = 0.48

    def get_platform_deflection(self, t: float, intensity: float) -> Tuple[float, float]:
        """Compute platform angular base deflection in degrees (pan, tilt)."""
        if intensity <= 0.0:
            return 0.0, 0.0

        # Maximum deflection amplitude in degrees (e.g. up to 1.5 degrees at intensity 1.0)
        max_deflection = intensity * 1.5

        sway_pan = (
            0.7 * math.sin(math.tau * self.freq_yaw * t)
            + 0.3 * math.sin(math.tau * 0.5 * self.freq_yaw * t + 0.8)
        )
        sway_tilt = (
            0.7 * math.cos(math.tau * self.freq_pitch * t + 0.4)
            + 0.3 * math.cos(math.tau * self.freq_roll * t)
        )

        return max_deflection * sway_pan, max_deflection * sway_tilt
