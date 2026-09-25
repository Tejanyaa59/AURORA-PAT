"""Telemetry buffer storing rolling in-memory samples for live analytics."""

import collections
import threading
import time
from typing import Any, Dict, List, Optional


class TelemetryLogger:
    """Thread-safe ring-buffer storing recent telemetry frames for live analytics."""

    def __init__(self, experiment_id: Optional[str] = None, max_samples: int = 1000):
        self._lock = threading.Lock()
        self.experiment_id = experiment_id or f"exp_{int(time.time())}"
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.samples: collections.deque = collections.deque(maxlen=max_samples)

    def set_experiment_id(self, exp_id: str) -> None:
        with self._lock:
            self.experiment_id = exp_id
            self.start_time = time.time()
            self.end_time = None
            self.samples.clear()

    def finalize(self) -> None:
        with self._lock:
            self.end_time = time.time()

    def log_frame(
        self,
        frame_id: int,
        timestamp: float,
        pan: float,
        tilt: float,
        error_x: float,
        error_y: float,
        error_mag: float,
        detected: bool,
        confidence: float,
        fps: float = 30.0,
    ) -> None:
        """Add telemetry record to in-memory sliding buffer."""
        record = {
            "frame_id": frame_id,
            "timestamp": timestamp,
            "t": round(max(0.0, timestamp - self.start_time), 3),
            "pan": round(pan, 3),
            "tilt": round(tilt, 3),
            "error_x": round(error_x, 2),
            "error_y": round(error_y, 2),
            "error_mag": round(error_mag, 2),
            "detected": detected,
            "target_detected": detected,
            "confidence": round(confidence, 3),
            "fps": round(fps, 1),
        }
        with self._lock:
            self.samples.append(record)

    def get_recent_samples(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Retrieve recent telemetry samples for time-series charts."""
        with self._lock:
            if not self.samples:
                return []
            items = list(self.samples)
            return items[-limit:] if len(items) > limit else items

    def flush(self) -> None:
        """No-op for disk I/O; frames are kept in memory."""
        pass


global_logger = TelemetryLogger()

