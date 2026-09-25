"""Asynchronous 30-FPS FSOC Coarse Alignment Simulation and Tracking Engine."""

import asyncio
import logging
import math
import sys
import threading
import time
from typing import Callable, List, Optional
import numpy as np

# Initialize 1ms timer period on Windows for precision ~30 FPS loop pacing
if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.winmm.timeBeginPeriod(1)
    except Exception:
        pass
from backend.control.pan_tilt import PanTiltController
from backend.disturbances import DisturbanceEngine
from backend.disturbances.atmosphere import get_scintillation_factor
from backend.evaluation.logger import global_logger
from backend.evaluation.metrics import global_metrics
from backend.models.schemas import SimulationConfig, SimulationStatusEnum, TrajectoryEnum
from backend.simulation.state import simulation_state
from backend.simulation.target import TargetManager
from backend.simulation.virtual_camera import VirtualCamera
from backend.tracking.tracker import OpticalTracker
from backend.vision.detector import draw_hud
from backend.vision.preprocessing import encode_frame_to_base64, render_optical_scene

logger = logging.getLogger("simulation_engine")


class SimulationEngine:
    """Master simulation engine executing the full optical tracking loop at ~30 FPS."""

    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

        # Core subsystems
        self.camera = VirtualCamera(simulation_state.config.camera)
        self.target_manager = TargetManager(simulation_state.config.target)
        self.disturbances = DisturbanceEngine()
        self.tracker = OpticalTracker(
            camera_center=(self.camera.width / 2.0, self.camera.height / 2.0)
        )
        self.controller = PanTiltController(self.camera, simulation_state.config.pid)

        # Broadcast callback hook for WebSocket subscribers
        self.broadcast_callback: Optional[Callable[[dict], None]] = None

        # Hook into state manager
        simulation_state.set_engine_hooks(
            start_hook=self.start,
            stop_hook=self.stop,
            reset_hook=self.reset,
            reconfigure_hook=self.reconfigure,
        )

        # Timing tracking
        self.target_fps: float = 30.0
        self.frame_interval: float = 1.0 / 30.0
        self.sim_time: float = 0.0

    def set_broadcast_callback(self, callback: Callable[[dict], None]) -> None:
        """Register a callback for streaming telemetry packets."""
        self.broadcast_callback = callback

    def reconfigure(self, config: SimulationConfig) -> None:
        """Apply dynamic configuration updates to subsystems."""
        with self._lock:
            self.camera.reconfigure(config.camera)
            self.target_manager.reconfigure(config.target)
            self.controller.reconfigure(config.pid)
            if hasattr(config.target, "detector_mode"):
                self.tracker.detector_mode = config.target.detector_mode
            self.tracker.camera_center = (
                self.camera.width / 2.0,
                self.camera.height / 2.0,
            )

    def reset(self) -> None:
        """Reset all internal subsystems for a fresh simulation run."""
        with self._lock:
            self.sim_time = 0.0
            self.camera.reset()
            self.tracker.reset()
            self.controller.reset()
            self.target_manager.initialize_targets()
            global_metrics.reset()
            global_logger.set_experiment_id(f"exp_{int(time.time())}")

    def start(self) -> None:
        """Start the background simulation execution thread."""
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Signal thread to stop."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=1.0)
            self._thread = None
        global_logger.finalize()
        try:
            from backend.evaluation.report import generate_experiment_report
            generate_experiment_report(simulation_state.config)
        except Exception:
            pass

    def _run_loop(self) -> None:
        """High-precision ~30 FPS simulation loop."""
        last_tick = time.perf_counter()

        while not self._stop_event.is_set():
            loop_start = time.perf_counter()
            dt = max(0.005, min(0.1, loop_start - last_tick))
            last_tick = loop_start

            # Execute step if simulation is active and not paused
            if simulation_state.running and not simulation_state.paused:
                self._step(dt)

            # High precision frame pacing targeting rock-solid 30 FPS
            compute_time = time.perf_counter() - loop_start
            rem_time = self.frame_interval - compute_time
            if rem_time > 0.003:
                self._stop_event.wait(rem_time - 0.002)
            while (time.perf_counter() - loop_start) < self.frame_interval:
                if self._stop_event.is_set():
                    break

    def step(self, dt: float) -> None:
        """Advance simulation by dt seconds (public API)."""
        self._step(dt)

    def _step(self, dt: float) -> None:
        """Advance simulation by dt seconds."""
        with self._lock:
            if not simulation_state.running or self._stop_event.is_set():
                return
            config = simulation_state.config
            self.sim_time += dt
            simulation_state.frame_id += 1
            frame_id = simulation_state.frame_id
            t = self.sim_time

            # 1. Environmental & Mount Disturbances
            j_pan, j_tilt = self.disturbances.get_angular_disturbance(
                config.disturbances, t
            )
            self.camera.set_jitter(j_pan, j_tilt)

            scint_factor = 1.0
            if config.disturbances.brightness_variation.enabled:
                scint_factor = get_scintillation_factor(
                    t, config.disturbances.brightness_variation.intensity
                )

            # 2. Target Positions & Projection onto Camera Sensor
            targets = self.target_manager.update(t)
            is_obscured = (
                getattr(config.target, "trajectory", None) == TrajectoryEnum.straight
                and 4.0 <= t <= 6.0
            )
            for tgt in targets:
                u, v, in_fov = self.camera.world_to_camera(tgt.world_x, tgt.world_y)
                tgt.cam_x = u
                tgt.cam_y = v
                tgt.is_in_fov = in_fov and not is_obscured

            # 3. Optical Sensor Frame Synthesis
            raw_frame = render_optical_scene(
                self.camera.width,
                self.camera.height,
                targets,
                scintillation_factor=scint_factor,
            )

            # Apply optical channel & electronic sensor noise disturbances
            disturbed_frame = self.disturbances.apply_to_frame(
                raw_frame, config.disturbances, t
            )

            # 4. Computer Vision / AI Detection, Kalman Filter, & State Machine
            det_mode = getattr(config.target, "detector_mode", "AI")
            track_result = self.tracker.process_frame(
                disturbed_frame, dt, current_time=t, detector_mode=det_mode
            )
            if simulation_state.running and not self._stop_event.is_set():
                simulation_state.status = track_result.status

            # 5. Closed-Loop Gimbal Slew Control
            self.controller.update(track_result.status, track_result.target_pos, dt)

            # 6. Performance Benchmark Metrics & Telemetry Logging
            global_metrics.record_frame(
                error_mag=track_result.error_magnitude,
                detected=track_result.target_detected,
                confidence=track_result.confidence,
                acq_time=self.tracker.acquisition_time,
                reacq_time=self.tracker.reacquisition_time,
                loss_events=self.tracker.target_loss_events,
                detector_mode=track_result.detector_mode,
                ai_confidence=track_result.ai_confidence,
                ai_inference_ms=track_result.ai_inference_ms,
            )

            global_logger.log_frame(
                frame_id=frame_id,
                timestamp=t,
                pan=self.camera.pan,
                tilt=self.camera.tilt,
                error_x=track_result.error_x,
                error_y=track_result.error_y,
                error_mag=track_result.error_magnitude,
                detected=track_result.target_detected,
                confidence=track_result.confidence,
                fps=global_metrics.current_fps,
            )

            # 7. Render Tactical HUD & Encode Frame
            annotated_frame = draw_hud(
                disturbed_frame,
                status=track_result.status.value,
                target_pos=track_result.target_pos,
                predicted_pos=track_result.predicted_pos,
                confidence=track_result.confidence,
                pan_deg=self.camera.pan,
                tilt_deg=self.camera.tilt,
                fps=global_metrics.current_fps,
                detector_mode=track_result.detector_mode,
                ai_confidence=track_result.ai_confidence,
                ai_inference_ms=track_result.ai_inference_ms,
            )
            b64_frame = encode_frame_to_base64(annotated_frame, quality=70)

            # 8. Construct WebSocket Telemetry Packet
            desig_target = self.target_manager.get_designated_target()
            target_obj = None
            if track_result.target_pos is not None:
                target_obj = {
                    "id": desig_target.target_id if desig_target else 1,
                    "x": track_result.target_pos[0],
                    "y": track_result.target_pos[1],
                    "predicted_x": (
                        track_result.predicted_pos[0]
                        if track_result.predicted_pos
                        else None
                    ),
                    "predicted_y": (
                        track_result.predicted_pos[1]
                        if track_result.predicted_pos
                        else None
                    ),
                    "confidence": track_result.confidence,
                    "detected": track_result.target_detected,
                    "designated": True,
                    "uncertainty": track_result.uncertainty,
                    "velocity_x": track_result.velocity_x,
                    "velocity_y": track_result.velocity_y,
                    "kalman_state": track_result.kalman_state,
                }

            targets_list = [
                {
                    "id": tgt.target_id,
                    "x": tgt.cam_x or 0.0,
                    "y": tgt.cam_y or 0.0,
                    "confidence": (
                        track_result.confidence if tgt.designated else 0.85
                    ),
                    "detected": tgt.is_in_fov,
                    "designated": tgt.designated,
                }
                for tgt in targets
                if tgt.is_in_fov
            ]

            perf_snap = global_metrics.get_snapshot()
            perf_snap["detector_mode"] = track_result.detector_mode
            perf_snap["ai_confidence"] = track_result.ai_confidence
            perf_snap["ai_inference_ms"] = track_result.ai_inference_ms

            payload = {
                "frame_id": frame_id,
                "timestamp": round(time.time(), 3),
                "status": track_result.status.value,
                "target_detected": track_result.target_detected,
                "target": target_obj,
                "targets": targets_list,
                "designated_target_id": (
                    desig_target.target_id if desig_target else 1
                ),
                "camera_center": {
                    "x": self.camera.width / 2.0,
                    "y": self.camera.height / 2.0,
                },
                "error": {
                    "x": track_result.error_x,
                    "y": track_result.error_y,
                    "magnitude": track_result.error_magnitude,
                },
                "camera": {
                    "pan": round(self.camera.pan, 3),
                    "tilt": round(self.camera.tilt, 3),
                    "pan_speed": round(self.camera.pan_speed, 2),
                    "tilt_speed": round(self.camera.tilt_speed, 2),
                    "commanded_pan_deg_s": round(self.controller.last_cmd_pan_rate, 2),
                    "commanded_tilt_deg_s": round(self.controller.last_cmd_tilt_rate, 2),
                    "actual_pan_deg": round(self.camera.pan, 3),
                    "actual_tilt_deg": round(self.camera.tilt, 3),
                    "min_pan_deg": self.camera.min_pan,
                    "max_pan_deg": self.camera.max_pan,
                    "min_tilt_deg": self.camera.min_tilt,
                    "max_tilt_deg": self.camera.max_tilt,
                },
                "performance": perf_snap,
                "frame": b64_frame,
                "frame_info": {
                    "width": self.camera.width,
                    "height": self.camera.height,
                },
                "confidence": track_result.confidence,
                "detector_mode": track_result.detector_mode,
                "ai_confidence": track_result.ai_confidence,
                "ai_inference_ms": track_result.ai_inference_ms,
                "error_x_px": track_result.error_x,
                "error_y_px": track_result.error_y,
                "commanded_pan_deg_s": round(self.controller.last_cmd_pan_rate, 2),
                "commanded_tilt_deg_s": round(self.controller.last_cmd_tilt_rate, 2),
                "actual_pan_deg": round(self.camera.pan, 3),
                "actual_tilt_deg": round(self.camera.tilt, 3),
                "velocity_x": track_result.velocity_x,
                "velocity_y": track_result.velocity_y,
                "kalman_state": track_result.kalman_state,
                "min_pan_deg": self.camera.min_pan,
                "max_pan_deg": self.camera.max_pan,
                "min_tilt_deg": self.camera.min_tilt,
                "max_tilt_deg": self.camera.max_tilt,
                "message": simulation_state.message,
            }

            # 9. Broadcast to WebSocket subscribers
            if self.broadcast_callback is not None:
                try:
                    self.broadcast_callback(payload)
                except Exception:
                    pass


global_engine = SimulationEngine()

