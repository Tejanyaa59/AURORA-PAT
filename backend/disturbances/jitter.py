"""Mechanical and optical mount jitter disturbances."""

import math
import random
from typing import Tuple


class MountJitter:
    """Simulates high-frequency angular vibration from cryo-coolers, motors, and wind buffeting."""

    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
        # Characteristic structural harmonic frequencies (Hz)
        self.f1 = 18.0
        self.f2 = 32.5
        self.f3 = 54.0
        self.p1 = self.rng.uniform(0, math.tau)
        self.p2 = self.rng.uniform(0, math.tau)
        self.p3 = self.rng.uniform(0, math.tau)

    def get_jitter_offset(self, t: float, intensity: float) -> Tuple[float, float]:
        """Compute angular LOS jitter perturbation in degrees (pan, tilt)."""
        if intensity <= 0.0:
            return 0.0, 0.0

        # Maximum jitter amplitude in degrees (up to ~0.25 deg at max intensity)
        amp = intensity * 0.25

        harmonic_x = (
            0.55 * math.sin(math.tau * self.f1 * t + self.p1)
            + 0.30 * math.cos(math.tau * self.f2 * t + self.p2)
            + 0.15 * math.sin(math.tau * self.f3 * t + self.p3)
        )
        harmonic_y = (
            0.50 * math.cos(math.tau * self.f1 * t + self.p2)
            + 0.35 * math.sin(math.tau * self.f2 * t + self.p3)
            + 0.15 * math.cos(math.tau * self.f3 * t + self.p1)
        )

        noise_x = self.rng.gauss(0.0, 0.1)
        noise_y = self.rng.gauss(0.0, 0.1)

        jitter_pan = amp * (harmonic_x + noise_x)
        jitter_tilt = amp * (harmonic_y + noise_y)

        return jitter_pan, jitter_tilt
