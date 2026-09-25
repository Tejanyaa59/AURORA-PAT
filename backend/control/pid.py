"""Industrial-grade PID controller with anti-windup clamping and derivative filter."""

import math
from typing import Optional, Tuple
from backend.models.schemas import PIDConfig, PIDGains


class PIDController:
    """Discrete single-axis PID controller with integral clamping and derivative filtering."""

    def __init__(
        self,
        kp: float = 1.8,
        ki: float = 0.8,
        kd: float = 0.15,
        output_limit: float = 90.0,
        integral_limit: float = 30.0,
        filter_coeff: float = 0.80,
    ):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.output_limit = output_limit
        self.integral_limit = integral_limit
        self.filter_coeff = filter_coeff

        self.integral: float = 0.0
        self.prev_error: float = 0.0
        self.filtered_derivative: float = 0.0
        self.has_prev: bool = False

    def reset(self) -> None:
        """Reset internal integrator and differentiator history."""
        self.integral = 0.0
        self.prev_error = 0.0
        self.filtered_derivative = 0.0
        self.has_prev = False

    def update(self, error: float, dt: float, is_at_limit: bool = False) -> float:
        """Compute PID control output for time step dt with anti-windup protection."""
        dt = max(dt, 1e-4)

        # Proportional term
        p_term = self.kp * error

        # Derivative term with first-order low-pass filter
        if self.has_prev:
            raw_deriv = (error - self.prev_error) / dt
            self.filtered_derivative = (
                self.filter_coeff * self.filtered_derivative
                + (1.0 - self.filter_coeff) * raw_deriv
            )
        else:
            self.filtered_derivative = 0.0
            self.has_prev = True

        self.prev_error = error
        d_term = self.kd * self.filtered_derivative

        # Anti-windup clamping (conditional integration):
        # Check if tentative control output drives further into motor saturation
        tentative_output = p_term + self.ki * self.integral + d_term
        sat_pos = (tentative_output >= self.output_limit) and (error > 0)
        sat_neg = (tentative_output <= -self.output_limit) and (error < 0)

        # Integrate only within coarse tracking capture zone (< 8.0 deg)
        # and only when not driving further into motor rate or mechanical travel saturation
        if abs(error) <= 8.0 and not (sat_pos or sat_neg or is_at_limit):
            self.integral += error * dt
            self.integral = max(-self.integral_limit, min(self.integral_limit, self.integral))

        i_term = self.ki * self.integral
        output = p_term + i_term + d_term

        # Saturate to output limits
        saturated = max(-self.output_limit, min(self.output_limit, output))
        return saturated


class DualAxisPIDController:
    """Coordinates independent Pan and Tilt control loops for gimbal pointing."""

    def __init__(self, config: Optional[PIDConfig] = None):
        self.config = config or PIDConfig()
        self.pan_pid = PIDController(
            kp=self.config.pan.kp,
            ki=self.config.pan.ki,
            kd=self.config.pan.kd,
            output_limit=90.0,
        )
        self.tilt_pid = PIDController(
            kp=self.config.tilt.kp,
            ki=self.config.tilt.ki,
            kd=self.config.tilt.kd,
            output_limit=90.0,
        )

    def reconfigure(self, config: PIDConfig) -> None:
        """Apply updated PID gains."""
        self.config = config
        self.pan_pid.kp = config.pan.kp
        self.pan_pid.ki = config.pan.ki
        self.pan_pid.kd = config.pan.kd

        self.tilt_pid.kp = config.tilt.kp
        self.tilt_pid.ki = config.tilt.ki
        self.tilt_pid.kd = config.tilt.kd

    def reset(self) -> None:
        """Reset both PID loops."""
        self.pan_pid.reset()
        self.tilt_pid.reset()

    def compute_rate_commands(
        self,
        error_pan_deg: float,
        error_tilt_deg: float,
        dt: float,
        is_pan_at_limit: bool = False,
        is_tilt_at_limit: bool = False,
    ) -> Tuple[float, float]:
        """Compute commanded slew rates in deg/s for Pan and Tilt motors with mechanical limit protection."""
        cmd_pan_rate = self.pan_pid.update(error_pan_deg, dt, is_at_limit=is_pan_at_limit)
        cmd_tilt_rate = self.tilt_pid.update(error_tilt_deg, dt, is_at_limit=is_tilt_at_limit)
        return cmd_pan_rate, cmd_tilt_rate
