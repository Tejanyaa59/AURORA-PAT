"""Performance evaluation metrics for FSOC coarse alignment."""

import collections
import math
import threading
import time
from typing import Any, Deque, Dict, Optional


class PerformanceMetricsCalculator:
    """Thread-safe accumulator calculating real-time FSOC tracking benchmark statistics."""

    def __init__(self, history_len: int = 1000, coarse_threshold_px: float = 24.0):
        self._lock = threading.Lock()
        self.history_len = history_len
        self.coarse_thresh = coarse_threshold_px

        # Rolling buffers
        self.errors: Deque[float] = collections.deque(maxlen=history_len)
        self.timestamps: Deque[float] = collections.deque(maxlen=history_len)
        self.detection_flags: Deque[bool] = collections.deque(maxlen=history_len)
        self.aligned_flags: Deque[bool] = collections.deque(maxlen=history_len)
        self.confidences: Deque[float] = collections.deque(maxlen=history_len)

        # Lifetime counters
        self.total_frames: int = 0
        self.lost_frames: int = 0
        self.aligned_frames: int = 0
        self.sum_error: float = 0.0
        self.sum_sq_error: float = 0.0
        self.max_error: float = 0.0

        # Timing metrics
        self.acquisition_time: Optional[float] = None
        self.reacquisition_time: Optional[float] = None
        self.target_loss_events: int = 0

        # FPS calculation
        self._last_fps_calc_time = time.time()
        self._fps_frame_count = 0
        self.current_fps: float = 30.0

        # AI & detector telemetry
        self.latest_detector_mode: Optional[str] = None
        self.latest_ai_confidence: Optional[float] = None
        self.latest_ai_inference_ms: Optional[float] = None

    def reset(self) -> None:
        """Reset all metrics."""
        with self._lock:
            self.errors.clear()
            self.timestamps.clear()
            self.detection_flags.clear()
            self.aligned_flags.clear()
            self.confidences.clear()

            self.total_frames = 0
            self.lost_frames = 0
            self.aligned_frames = 0
            self.sum_error = 0.0
            self.sum_sq_error = 0.0
            self.max_error = 0.0

            self.acquisition_time = None
            self.reacquisition_time = None
            self.target_loss_events = 0
            self.current_fps = 30.0
            self._last_fps_calc_time = time.time()
            self._fps_frame_count = 0

            self.latest_detector_mode = None
            self.latest_ai_confidence = None
            self.latest_ai_inference_ms = None

    def record_frame(
        self,
        error_mag: float,
        detected: bool,
        confidence: float,
        acq_time: Optional[float] = None,
        reacq_time: Optional[float] = None,
        loss_events: Optional[int] = None,
        detector_mode: Optional[str] = None,
        ai_confidence: Optional[float] = None,
        ai_inference_ms: Optional[float] = None,
    ) -> None:
        """Record telemetry for a processed frame."""
        now = time.time()
        with self._lock:
            self.total_frames += 1
            self._fps_frame_count += 1

            if detector_mode is not None:
                self.latest_detector_mode = detector_mode
            if ai_confidence is not None:
                self.latest_ai_confidence = round(float(ai_confidence), 4)
            if ai_inference_ms is not None:
                self.latest_ai_inference_ms = round(float(ai_inference_ms), 2)

            # Update FPS every 0.5 seconds
            elapsed = now - self._last_fps_calc_time
            if elapsed >= 0.5:
                self.current_fps = round(self._fps_frame_count / elapsed, 1)
                self._fps_frame_count = 0
                self._last_fps_calc_time = now

            if not detected:
                self.lost_frames += 1

            is_aligned = detected and (error_mag <= self.coarse_thresh)
            if is_aligned:
                self.aligned_frames += 1

            if detected:
                self.sum_error += error_mag
                self.sum_sq_error += error_mag * error_mag
                if error_mag > self.max_error:
                    self.max_error = error_mag

            self.errors.append(error_mag)
            self.timestamps.append(now)
            self.detection_flags.append(detected)
            self.aligned_flags.append(is_aligned)
            self.confidences.append(confidence)

            if acq_time is not None and self.acquisition_time is None:
                self.acquisition_time = acq_time
            if reacq_time is not None:
                self.reacquisition_time = reacq_time
            if loss_events is not None:
                self.target_loss_events = loss_events

    def get_snapshot(self) -> Dict[str, Any]:
        """Compute current performance summary snapshot."""
        with self._lock:
            n = self.total_frames
            detected_n = n - self.lost_frames

            if detected_n > 0:
                avg_err = round(self.sum_error / detected_n, 2)
                rms_err = round(math.sqrt(self.sum_sq_error / detected_n), 2)
            else:
                avg_err = 0.0
                rms_err = 0.0

            loss_pct = round((self.lost_frames / max(n, 1)) * 100.0, 1)
            success_pct = round((self.aligned_frames / max(n, 1)) * 100.0, 1)
            det_rate = round((detected_n / max(n, 1)) * 100.0, 1)

            latest_conf = self.confidences[-1] if self.confidences else 0.0

            # Compute effective average FPS across the run if timestamps span >= 0.5s
            effective_fps = self.current_fps
            if len(self.timestamps) >= 2:
                total_duration = self.timestamps[-1] - self.timestamps[0]
                if total_duration >= 0.5:
                    effective_fps = round((len(self.timestamps) - 1) / total_duration, 1)

            return {
                "fps": effective_fps,
                "acquisition_time": self.acquisition_time or 0.0,
                "average_error": avg_err,
                "maximum_error": round(self.max_error, 2),
                "rms_error": rms_err,
                "target_loss_percentage": loss_pct,
                "reacquisition_time": self.reacquisition_time or 0.0,
                "tracking_success_percentage": success_pct,
                "detection_confidence": round(latest_conf, 4),
                "detection_rate": det_rate,
                "frames_processed": self.total_frames,
                "target_loss_events": self.target_loss_events,
                "detector_mode": self.latest_detector_mode,
                "ai_confidence": self.latest_ai_confidence,
                "ai_inference_ms": self.latest_ai_inference_ms,
            }


global_metrics = PerformanceMetricsCalculator()
