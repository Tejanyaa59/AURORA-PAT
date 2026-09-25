"""Trajectory generators for simulated optical beacons."""

import math
import random
from abc import ABC, abstractmethod
from typing import Tuple


class BaseTrajectory(ABC):
    """Abstract base class for target motion trajectories."""

    @abstractmethod
    def get_position(self, t: float) -> Tuple[float, float]:
        """Compute target position (x, y) in world coordinate space at time t."""
        pass


class StraightTrajectory(BaseTrajectory):
    """Linear target motion with smooth boundary bounce."""

    def __init__(
        self,
        center_x: float,
        center_y: float,
        speed: float,
        heading_rad: float = 0.6,
        bounds: Tuple[float, float] = (1600.0, 1600.0),
    ):
        self.center_x = center_x
        self.center_y = center_y
        self.speed = speed
        self.vx = speed * math.cos(heading_rad)
        self.vy = speed * math.sin(heading_rad)
        self.half_w = min(bounds[0] / 2.0, 250.0)
        self.half_h = min(bounds[1] / 2.0, 250.0)

    def get_position(self, t: float) -> Tuple[float, float]:
        # Smooth motion centered at (center_x, center_y) starting at t=0
        period_x = (4 * self.half_w) / (abs(self.vx) + 1e-5)
        period_y = (4 * self.half_h) / (abs(self.vy) + 1e-5)

        phase_x = (t % period_x) / period_x
        phase_y = (t % period_y) / period_y

        # Start at 0 offset at t=0: smooth oscillation through center
        tri_x = math.sin(2.0 * math.pi * phase_x)
        tri_y = math.sin(2.0 * math.pi * phase_y)

        x = self.center_x + tri_x * self.half_w * 0.8
        y = self.center_y + tri_y * self.half_h * 0.8
        return x, y


class CircularTrajectory(BaseTrajectory):
    """Circular trajectory simulating orbital or loitering mobile terminals."""

    def __init__(
        self,
        center_x: float,
        center_y: float,
        speed: float,
        radius: float = 250.0,
        phase: float = 0.0,
    ):
        self.center_x = center_x
        self.center_y = center_y
        self.radius = max(radius, 50.0)
        # omega = speed / radius (rad/s)
        self.omega = max(speed / self.radius, 0.05)
        self.phase = phase

    def get_position(self, t: float) -> Tuple[float, float]:
        angle = self.omega * t + self.phase
        x = self.center_x + self.radius * math.cos(angle)
        y = self.center_y + self.radius * math.sin(angle)
        return x, y


class Figure8Trajectory(BaseTrajectory):
    """Figure-8 (Lemniscate) trajectory simulating dynamic tactical maneuvers."""

    def __init__(
        self,
        center_x: float,
        center_y: float,
        speed: float,
        scale: float = 400.0,
        phase: float = 0.0,
    ):
        self.center_x = center_x
        self.center_y = center_y
        self.scale = max(scale, 50.0)
        self.omega = max(speed / (self.scale * 1.2), 0.05)
        self.phase = phase

    def get_position(self, t: float) -> Tuple[float, float]:
        angle = self.omega * t + self.phase
        # Gerono lemniscate
        x = self.center_x + self.scale * math.sin(angle)
        y = self.center_y + (self.scale * 0.6) * math.sin(2.0 * angle)
        return x, y


class RandomTrajectory(BaseTrajectory):
    """Smooth pseudo-random trajectory with continuous bandlimited frequency components."""

    def __init__(
        self,
        center_x: float,
        center_y: float,
        speed: float,
        scale: float = 350.0,
        seed: int = 42,
    ):
        self.center_x = center_x
        self.center_y = center_y
        self.scale = scale
        rng = random.Random(seed)
        # Superposition of incommensurate sinusoids for repeatable smooth pseudo-randomness
        self.w1 = 0.08 * (speed / 40.0)
        self.w2 = 0.19 * (speed / 40.0)
        self.w3 = 0.31 * (speed / 40.0)
        self.p1 = rng.uniform(0, math.tau)
        self.p2 = rng.uniform(0, math.tau)
        self.p3 = rng.uniform(0, math.tau)
        self.p4 = rng.uniform(0, math.tau)

    def get_position(self, t: float) -> Tuple[float, float]:
        x = (
            self.center_x
            + self.scale * 0.6 * math.sin(self.w1 * t + self.p1)
            + self.scale * 0.4 * math.cos(self.w2 * t + self.p2)
        )
        y = (
            self.center_y
            + self.scale * 0.5 * math.cos(self.w1 * 0.9 * t + self.p3)
            + self.scale * 0.3 * math.sin(self.w3 * t + self.p4)
        )
        return x, y


def create_trajectory(
    trajectory_type: str,
    speed: float,
    center_x: float = 1000.0,
    center_y: float = 1000.0,
    radius: float = 250.0,
    phase: float = 0.0,
) -> BaseTrajectory:
    """Factory function for creating trajectory models."""
    t_type = trajectory_type.lower()
    if t_type == "straight":
        return StraightTrajectory(center_x, center_y, speed)
    elif t_type == "figure8":
        return Figure8Trajectory(center_x, center_y, speed, scale=radius, phase=phase)
    elif t_type == "random":
        return RandomTrajectory(center_x, center_y, speed, scale=radius)
    else:  # default to circular
        return CircularTrajectory(center_x, center_y, speed, radius=radius, phase=phase)
