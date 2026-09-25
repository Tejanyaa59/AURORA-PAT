"""4D Linear Kalman Filter for optical target position and velocity estimation."""

import math
from typing import Optional, Tuple
import numpy as np


class KalmanFilter4D:
    """Constant-velocity Kalman Filter tracking position (x, y) and velocity (vx, vy)."""

    def __init__(
        self,
        process_noise_accel: float = 8.0,
        measurement_noise_pos: float = 2.0,
    ):
        self.q_var = process_noise_accel ** 2
        self.r_var = measurement_noise_pos ** 2

        # State vector: [x, y, vx, vy]^T
        self.x = np.zeros(4, dtype=np.float64)

        # State covariance matrix P (4x4)
        self.P = np.eye(4, dtype=np.float64) * 100.0

        # Measurement matrix H (2x4)
        self.H = np.array(
            [[1.0, 0.0, 0.0, 0.0],
             [0.0, 1.0, 0.0, 0.0]],
            dtype=np.float64,
        )

        # Measurement covariance R (2x2)
        self.R = np.eye(2, dtype=np.float64) * self.r_var

        self.initialized: bool = False
        self.last_predicted_pos: Tuple[float, float] = (0.0, 0.0)

    def initialize(self, x: float, y: float, vx: float = 0.0, vy: float = 0.0) -> None:
        """Initialize filter state at detected position."""
        self.x = np.array([x, y, vx, vy], dtype=np.float64)
        self.P = np.diag([self.r_var, self.r_var, 25.0, 25.0])
        self.last_predicted_pos = (x, y)
        self.initialized = True

    def predict(self, dt: float) -> Tuple[float, float]:
        """Predict state forward by dt seconds."""
        if not self.initialized:
            return 0.0, 0.0

        dt = max(dt, 1e-4)

        # State transition matrix F
        F = np.array(
            [
                [1.0, 0.0, dt, 0.0],
                [0.0, 1.0, 0.0, dt],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
            dtype=np.float64,
        )

        # Discrete process noise covariance Q (white noise acceleration model)
        dt2 = dt * dt
        dt3 = dt2 * dt / 2.0
        dt4 = dt2 * dt2 / 4.0

        Q = self.q_var * np.array(
            [
                [dt4, 0.0, dt3, 0.0],
                [0.0, dt4, 0.0, dt3],
                [dt3, 0.0, dt2, 0.0],
                [0.0, dt3, 0.0, dt2],
            ],
            dtype=np.float64,
        )

        # Prior estimate
        self.x = F @ self.x
        self.P = F @ self.P @ F.T + Q
        self.last_predicted_pos = (float(self.x[0]), float(self.x[1]))
        return self.last_predicted_pos

    def update(self, z_x: float, z_y: float) -> Tuple[float, float]:
        """Incorporate new sensor measurement [z_x, z_y]."""
        if not self.initialized:
            self.initialize(z_x, z_y)
            return z_x, z_y

        z = np.array([z_x, z_y], dtype=np.float64)
        # Measurement residual (innovation)
        y = z - (self.H @ self.x)

        # Innovation covariance
        S = self.H @ self.P @ self.H.T + self.R

        # Kalman gain
        K = self.P @ self.H.T @ np.linalg.inv(S)

        # Posterior state update
        self.x = self.x + K @ y

        # Joseph form covariance update for numerical stability: P = (I - KH) P (I - KH)^T + K R K^T
        I = np.eye(4, dtype=np.float64)
        I_KH = I - K @ self.H
        self.P = I_KH @ self.P @ I_KH.T + K @ self.R @ K.T

        return float(self.x[0]), float(self.x[1])

    def get_position(self) -> Tuple[float, float]:
        """Return current estimated target position (x, y)."""
        return float(self.x[0]), float(self.x[1])

    def get_velocity(self) -> Tuple[float, float]:
        """Return current estimated target velocity (vx, vy)."""
        return float(self.x[2]), float(self.x[3])

    def get_uncertainty_radius(self) -> float:
        """Return 1-sigma positional uncertainty radius in pixels."""
        var_x = float(self.P[0, 0])
        var_y = float(self.P[1, 1])
        return round(math.sqrt(max(0.1, var_x + var_y)), 2)

    def reset(self) -> None:
        """Reset filter state."""
        self.x = np.zeros(4, dtype=np.float64)
        self.P = np.eye(4, dtype=np.float64) * 100.0
        self.initialized = False
        self.last_predicted_pos = (0.0, 0.0)
