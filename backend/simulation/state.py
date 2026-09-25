"""Thread-safe simulation state manager."""

import time
import threading
from typing import Optional, Tuple
from backend.models.schemas import (
    SimulationConfig,
    SimulationStatusEnum,
    SimulationStatusResponse,
)


class SimulationStateManager:
    """Manages the coarse alignment simulation lifecycle and parameters."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.server_start_time = time.time()
        self.status = SimulationStatusEnum.IDLE
        self.running = False
        self.paused = False
        self.frame_id = 0
        self.elapsed_time = 0.0
        self._run_start_time: Optional[float] = None
        self._accumulated_time = 0.0
        self._pre_pause_status = SimulationStatusEnum.SEARCHING
        self.message: Optional[str] = "Simulation initialized in IDLE state"
        self.config = SimulationConfig()

        # Engine lifecycle callbacks
        self._on_start_hook = None
        self._on_stop_hook = None
        self._on_reset_hook = None
        self._on_reconfigure_hook = None

    def set_engine_hooks(
        self, start_hook=None, stop_hook=None, reset_hook=None, reconfigure_hook=None
    ) -> None:
        self._on_start_hook = start_hook
        self._on_stop_hook = stop_hook
        self._on_reset_hook = reset_hook
        self._on_reconfigure_hook = reconfigure_hook

    def get_uptime(self) -> float:
        return round(time.time() - self.server_start_time, 2)

    def configure(self, config: SimulationConfig) -> Tuple[bool, str]:
        with self._lock:
            self.config = config
            self.message = "Configuration applied successfully"
            if self._on_reconfigure_hook:
                self._on_reconfigure_hook(config)
            return True, self.message

    def start(self) -> Tuple[bool, str]:
        with self._lock:
            if self.running and not self.paused:
                return False, "Simulation is already running"
            if self.paused:
                return False, "Simulation is paused. Use resume instead of start"

            self.running = True
            self.paused = False
            self.status = SimulationStatusEnum.SEARCHING
            self.frame_id = 0
            self._accumulated_time = 0.0
            self._run_start_time = time.time()
            self.message = "Simulation started — searching for optical beacon"
            if self._on_start_hook:
                self._on_start_hook()
            return True, self.message

    def pause(self) -> Tuple[bool, str]:
        with self._lock:
            if not self.running:
                return False, "Cannot pause when simulation is not running"
            if self.paused:
                return False, "Simulation is already paused"

            # Accumulate elapsed time up to now
            if self._run_start_time is not None:
                self._accumulated_time += time.time() - self._run_start_time
                self._run_start_time = None

            self.paused = True
            self._pre_pause_status = self.status
            self.status = SimulationStatusEnum.PAUSED
            self.message = "Simulation paused"
            return True, self.message

    def resume(self) -> Tuple[bool, str]:
        with self._lock:
            if not self.paused:
                return False, "Simulation is not paused"

            self.paused = False
            self._run_start_time = time.time()
            self.status = self._pre_pause_status
            self.message = f"Simulation resumed in {self.status.value} state"
            return True, self.message

    def stop(self) -> Tuple[bool, str]:
        with self._lock:
            if not self.running and self.status == SimulationStatusEnum.STOPPED:
                return False, "Simulation is already stopped"

            if self._run_start_time is not None and not self.paused:
                self._accumulated_time += time.time() - self._run_start_time
                self._run_start_time = None

            self.running = False
            self.paused = False
            self.status = SimulationStatusEnum.STOPPED
            self.message = "Simulation stopped"
            if self._on_stop_hook:
                self._on_stop_hook()
            return True, self.message

    def reset(self) -> Tuple[bool, str]:
        with self._lock:
            self.running = False
            self.paused = False
            self.status = SimulationStatusEnum.IDLE
            self.frame_id = 0
            self.elapsed_time = 0.0
            self._accumulated_time = 0.0
            self._run_start_time = None
            self.message = "Simulation reset to IDLE"
            if self._on_reset_hook:
                self._on_reset_hook()
            return True, self.message

    def get_status_response(self) -> SimulationStatusResponse:
        with self._lock:
            current_elapsed = self._accumulated_time
            if self.running and not self.paused and self._run_start_time is not None:
                current_elapsed += time.time() - self._run_start_time

            return SimulationStatusResponse(
                status=self.status,
                running=self.running,
                paused=self.paused,
                frame_id=self.frame_id,
                elapsed_time=round(current_elapsed, 2),
                message=self.message,
                config=self.config,
            )


simulation_state = SimulationStateManager()
