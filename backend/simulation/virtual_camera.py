"""Virtual camera and gimbal model for FSOC terminal tracking."""

import math
import random
from typing import Optional, Tuple
from backend.models.schemas import CameraConfig


class VirtualCamera:
    """Simulates the receiver terminal gimbal mount and focal plane array."""

    def __init__(self, config: Optional[CameraConfig] = None):
        self.config = config or CameraConfig()
        self.width = self.config.width
        self.height = self.config.height

        # Field of View (degrees)
        self.horizontal_fov = float(self.config.horizontal_fov)
        self.vertical_fov = float(self.config.vertical_fov)

        # Scale factors: degrees per sensor pixel
        self.deg_per_px_x = self.horizontal_fov / max(self.width, 1)
        self.deg_per_px_y = self.vertical_fov / max(self.height, 1)

        # Gimbal orientation (degrees)
        self.pan: float = 0.0
        self.tilt: float = 0.0

        # Gimbal speeds (deg/s)
        self.pan_speed: float = 0.0
        self.tilt_speed: float = 0.0

        # Mechanical limits (degrees)
        self.min_pan: float = float(getattr(self.config, "min_pan", -45.0))
        self.max_pan: float = float(getattr(self.config, "max_pan", 45.0))
        self.min_tilt: float = float(getattr(self.config, "min_tilt", -45.0))
        self.max_tilt: float = float(getattr(self.config, "max_tilt", 45.0))

        # Maximum gimbal slew rates (deg/s)
        self.max_pan_speed = float(self.config.max_pan_speed)
        self.max_tilt_speed = float(self.config.max_tilt_speed)

        # Jitter perturbation (deg)
        self.jitter_pan: float = 0.0
        self.jitter_tilt: float = 0.0

        # World canvas dimensions (2000x2000 minimum)
        self.world_w: float = 2000.0
        self.world_h: float = 2000.0
        self.world_center_x: float = 1000.0
        self.world_center_y: float = 1000.0

    def reconfigure(self, config: CameraConfig) -> None:
        """Apply updated camera parameters."""
        self.config = config
        self.width = config.width
        self.height = config.height
        self.horizontal_fov = float(config.horizontal_fov)
        self.vertical_fov = float(config.vertical_fov)
        self.deg_per_px_x = self.horizontal_fov / max(self.width, 1)
        self.deg_per_px_y = self.vertical_fov / max(self.height, 1)
        self.min_pan = float(getattr(config, "min_pan", -45.0))
        self.max_pan = float(getattr(config, "max_pan", 45.0))
        self.min_tilt = float(getattr(config, "min_tilt", -45.0))
        self.max_tilt = float(getattr(config, "max_tilt", 45.0))
        self.max_pan_speed = float(config.max_pan_speed)
        self.max_tilt_speed = float(config.max_tilt_speed)

    def set_jitter(self, jitter_x_deg: float, jitter_y_deg: float) -> None:
        """Inject platform/mechanical jitter into camera LOS."""
        self.jitter_pan = jitter_x_deg
        self.jitter_tilt = jitter_y_deg

    def step_control(self, cmd_pan_deg_s: float, cmd_tilt_deg_s: float, dt: float) -> None:
        """Update gimbal position subject to slew rate clamping and mechanical limits."""
        dt = max(dt, 1e-4)

        # Clamp commanded slew rates
        self.pan_speed = max(-self.max_pan_speed, min(self.max_pan_speed, cmd_pan_deg_s))
        self.tilt_speed = max(-self.max_tilt_speed, min(self.max_tilt_speed, cmd_tilt_deg_s))

        # Integrate angles
        new_pan = self.pan + self.pan_speed * dt
        new_tilt = self.tilt + self.tilt_speed * dt

        # Enforce gimbal travel limits
        self.pan = max(self.min_pan, min(self.max_pan, new_pan))
        self.tilt = max(self.min_tilt, min(self.max_tilt, new_tilt))

    def world_to_camera(
        self, world_x: float, world_y: float
    ) -> Tuple[float, float, bool]:
        """Project world coordinates to sensor pixel plane [0..width, 0..height].
        
        Returns:
            (u, v, is_in_fov)
        """
        # Convert world pixel offset to angular space relative to world origin
        target_pan_deg = (world_x - self.world_center_x) * self.deg_per_px_x
        target_tilt_deg = -(world_y - self.world_center_y) * self.deg_per_px_y

        # Camera effective LOS
        effective_pan = self.pan + self.jitter_pan
        effective_tilt = self.tilt + self.jitter_tilt

        # Angle relative to camera optical axis
        delta_pan = target_pan_deg - effective_pan
        delta_tilt = target_tilt_deg - effective_tilt

        # Project onto camera sensor
        center_u = self.width / 2.0
        center_v = self.height / 2.0

        u = center_u + (delta_pan / self.deg_per_px_x)
        v = center_v - (delta_tilt / self.deg_per_px_y)

        # Check field-of-view bounds
        is_in_fov = (0.0 <= u <= self.width) and (0.0 <= v <= self.height)
        return round(u, 2), round(v, 2), is_in_fov

    def camera_to_angular_error(self, u: float, v: float) -> Tuple[float, float, float]:
        """Compute angular error from camera image center in degrees.
        
        Returns:
            (error_pan_deg, error_tilt_deg, error_magnitude_deg)
        """
        center_u = self.width / 2.0
        center_v = self.height / 2.0

        du_px = u - center_u
        dv_px = v - center_v

        # du > 0 means target is to the right -> camera needs to pan right (positive pan)
        err_pan = du_px * self.deg_per_px_x
        # dv > 0 means target is down in image -> camera needs to tilt down (negative tilt)
        err_tilt = -dv_px * self.deg_per_px_y

        err_mag = math.hypot(err_pan, err_tilt)
        return err_pan, err_tilt, err_mag

    def get_center_pixel(self) -> Tuple[float, float]:
        """Return central pixel coordinates representing the optical axis."""
        return self.width / 2.0, self.height / 2.0

    def reset(self) -> None:
        """Reset gimbal to zero orientation and speed."""
        self.pan = 0.0
        self.tilt = 0.0
        self.pan_speed = 0.0
        self.tilt_speed = 0.0
        self.jitter_pan = 0.0
        self.jitter_tilt = 0.0

