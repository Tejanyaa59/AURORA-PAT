"""Closed-loop Pan-Tilt coarse alignment gimbal controller."""

import math
from typing import Optional, Tuple
from backend.control.pid import DualAxisPIDController
from backend.models.schemas import PIDConfig, SimulationStatusEnum
from backend.simulation.virtual_camera import VirtualCamera


class PanTiltController:
    """Manages closed-loop optical axis positioning and target acquisition scanning."""

    def __init__(
        self,
        camera: VirtualCamera,
        pid_config: Optional[PIDConfig] = None,
        alignment_tol_deg: float = 0.15,
    ):
        self.camera = camera
        self.pid = DualAxisPIDController(pid_config)
        self.alignment_tol_deg = alignment_tol_deg
        if hasattr(self.camera, "max_pan_speed"):
            self.pid.pan_pid.output_limit = self.camera.max_pan_speed
            self.pid.tilt_pid.output_limit = self.camera.max_tilt_speed

        # Search scan parameters
        self.scan_time: float = 0.0
        self.scan_pan_amp: float = 8.0
        self.scan_tilt_amp: float = 4.0

        # Commanded slew rates telemetry (deg/s)
        self.last_cmd_pan_rate: float = 0.0
        self.last_cmd_tilt_rate: float = 0.0
        self._prev_status: Optional[SimulationStatusEnum] = None

    def reconfigure(self, pid_config: PIDConfig) -> None:
        """Update PID parameters."""
        self.pid.reconfigure(pid_config)
        if hasattr(self.camera, "max_pan_speed"):
            self.pid.pan_pid.output_limit = self.camera.max_pan_speed
            self.pid.tilt_pid.output_limit = self.camera.max_tilt_speed

    def reset(self) -> None:
        """Reset gimbal controller and PID integrators."""
        self.pid.reset()
        self.scan_time = 0.0
        self.last_cmd_pan_rate = 0.0
        self.last_cmd_tilt_rate = 0.0
        self._prev_status = None

    def update(
        self,
        status: SimulationStatusEnum,
        target_cam_pos: Optional[Tuple[float, float]],
        dt: float,
    ) -> Tuple[float, float, float]:
        """Compute and execute gimbal steering command based on tracking state.
        
        Returns:
            (error_pan_deg, error_tilt_deg, error_mag_deg)
        """
        dt = max(dt, 1e-4)

        # Reset PID on acquisition transition from search mode to prevent derivative spikes
        if (
            self._prev_status == SimulationStatusEnum.SEARCHING
            and status in (SimulationStatusEnum.ACQUIRING, SimulationStatusEnum.TRACKING)
        ):
            self.pid.reset()
        self._prev_status = status

        if status in (SimulationStatusEnum.TRACKING, SimulationStatusEnum.ACQUIRING, SimulationStatusEnum.RE_ACQUIRING):
            if target_cam_pos is not None:
                # Target detected or predicted on camera sensor
                err_pan, err_tilt, err_mag = self.camera.camera_to_angular_error(
                    target_cam_pos[0], target_cam_pos[1]
                )

                # Mechanical travel limit checks for anti-windup integration freeze
                is_pan_at_limit = (
                    (self.camera.pan >= self.camera.max_pan and err_pan > 0)
                    or (self.camera.pan <= self.camera.min_pan and err_pan < 0)
                )
                is_tilt_at_limit = (
                    (self.camera.tilt >= self.camera.max_tilt and err_tilt > 0)
                    or (self.camera.tilt <= self.camera.min_tilt and err_tilt < 0)
                )

                # Compute PID commanded rates with mechanical anti-windup
                cmd_pan_rate, cmd_tilt_rate = self.pid.compute_rate_commands(
                    err_pan,
                    err_tilt,
                    dt,
                    is_pan_at_limit=is_pan_at_limit,
                    is_tilt_at_limit=is_tilt_at_limit,
                )
                self.last_cmd_pan_rate = cmd_pan_rate
                self.last_cmd_tilt_rate = cmd_tilt_rate

                # Apply commands to virtual camera gimbal
                self.camera.step_control(cmd_pan_rate, cmd_tilt_rate, dt)
                return err_pan, err_tilt, err_mag

        elif status == SimulationStatusEnum.SEARCHING:
            # Slow conical / Lissajous acquisition search pattern
            self.scan_time += dt
            scan_pan_rate = self.scan_pan_amp * math.cos(0.8 * self.scan_time)
            scan_tilt_rate = self.scan_tilt_amp * math.sin(1.6 * self.scan_time)
            self.last_cmd_pan_rate = scan_pan_rate
            self.last_cmd_tilt_rate = scan_tilt_rate
            self.camera.step_control(scan_pan_rate, scan_tilt_rate, dt)

        # No target error if not tracking
        self.last_cmd_pan_rate = 0.0
        self.last_cmd_tilt_rate = 0.0
        return 0.0, 0.0, 0.0
