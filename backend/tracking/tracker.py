"""Optical tracking state machine and Kalman fusion tracker."""

import math
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np
from backend.models.schemas import SimulationStatusEnum
from backend.tracking.association import associate_candidate
from backend.tracking.kalman import KalmanFilter4D
from backend.vision.ai_detector import AIBeaconDetector
from backend.vision.detector import BeaconCandidate, OpticalBeaconDetector


@dataclass
class TrackResult:
    """Output of tracking engine for one video/simulation frame."""
    status: SimulationStatusEnum
    target_detected: bool
    target_pos: Optional[Tuple[float, float]]
    predicted_pos: Optional[Tuple[float, float]]
    error_x: float
    error_y: float
    error_magnitude: float
    confidence: float
    uncertainty: float
    all_candidates: List[BeaconCandidate]
    detector_mode: str = "AI"
    ai_confidence: Optional[float] = None
    ai_inference_ms: Optional[float] = None
    velocity_x: Optional[float] = None
    velocity_y: Optional[float] = None
    kalman_state: Optional[str] = None


class OpticalTracker:
    """Multi-state optical beacon tracking engine with Kalman filtering and AI detection."""

    def __init__(
        self,
        camera_center: Tuple[float, float] = (320.0, 240.0),
        coarse_alignment_threshold_px: float = 24.0,
        acquire_frames_needed: int = 2,
        lost_frames_threshold: int = 15,
        coast_frames_threshold: int = 3,
        reacquire_frames_needed: int = 2,
        detector_mode: str = "AI",
    ):
        self.camera_center = camera_center
        self.alignment_thresh = coarse_alignment_threshold_px
        self.acquire_needed = acquire_frames_needed
        self.lost_thresh = lost_frames_threshold
        self.coast_thresh = coast_frames_threshold
        self.reacquire_needed = reacquire_frames_needed
        self.detector_mode = detector_mode

        self.cv_detector = OpticalBeaconDetector()
        self.ai_detector = AIBeaconDetector()
        self.kalman = KalmanFilter4D()

        self.status = SimulationStatusEnum.SEARCHING
        self.consecutive_hits: int = 0
        self.consecutive_misses: int = 0

        # Timing analytics
        self.search_start_time: Optional[float] = None
        self.lost_start_time: Optional[float] = None
        self.acquisition_time: Optional[float] = None
        self.reacquisition_time: Optional[float] = None
        self.target_loss_events: int = 0

    def reset(self) -> None:
        """Reset tracker state for new simulation run."""
        self.status = SimulationStatusEnum.SEARCHING
        self.kalman.reset()
        self.consecutive_hits = 0
        self.consecutive_misses = 0
        self.search_start_time = None
        self.lost_start_time = None
        self.acquisition_time = None
        self.reacquisition_time = None
        self.target_loss_events = 0

    def process_frame(
        self,
        bgr_frame: np.ndarray,
        dt: float,
        current_time: Optional[float] = None,
        detector_mode: Optional[str] = None,
    ) -> TrackResult:
        """Process one camera frame through detection, Kalman prediction, association, and state machine."""
        now = current_time or time.time()
        if self.search_start_time is None:
            self.search_start_time = now

        active_mode = detector_mode or self.detector_mode
        ai_conf: Optional[float] = None
        ai_inference_ms: Optional[float] = None

        # 1. Optical beacon detection via selected mode (AI, HYBRID, or OPENCV)
        if active_mode == "OPENCV":
            candidates = self.cv_detector.detect(bgr_frame)
            ai_inference_ms = 0.0
            ai_conf = candidates[0].confidence if candidates else 0.0
        elif active_mode == "AI":
            ai_cand, ai_conf, ai_inference_ms = self.ai_detector.detect(
                bgr_frame, cv_candidates=[], mode="AI"
            )
            candidates = [ai_cand] if ai_cand is not None else []
        else:  # HYBRID (default)
            cv_candidates = self.cv_detector.detect(bgr_frame)
            fused_cand, ai_conf, ai_inference_ms = self.ai_detector.detect(
                bgr_frame, cv_candidates=cv_candidates, mode="HYBRID"
            )
            if fused_cand is not None:
                candidates = [fused_cand]
            else:
                candidates = cv_candidates

        # 2. Kalman prediction step
        pred_x, pred_y = self.kalman.predict(dt)
        uncertainty = self.kalman.get_uncertainty_radius() if self.kalman.initialized else 30.0

        # 3. Data association
        associated: Optional[BeaconCandidate] = None
        if self.kalman.initialized:
            associated = associate_candidate(
                candidates, (pred_x, pred_y), uncertainty=uncertainty
            )
        elif candidates:
            # First acquisition: associate with highest confidence candidate
            associated = candidates[0]

        # 4. State machine transitions
        target_detected = associated is not None
        target_pos: Optional[Tuple[float, float]] = None
        confidence = 0.0

        if target_detected and associated is not None:
            self.consecutive_hits += 1
            self.consecutive_misses = 0
            confidence = associated.confidence

            # Measurement update in Kalman filter
            meas_x, meas_y = self.kalman.update(associated.x, associated.y)
            target_pos = (meas_x, meas_y)

            if self.status in (SimulationStatusEnum.SEARCHING, SimulationStatusEnum.IDLE):
                if self.consecutive_hits >= self.acquire_needed:
                    self.status = SimulationStatusEnum.TRACKING
                    if self.acquisition_time is None and self.search_start_time is not None:
                        self.acquisition_time = round(now - self.search_start_time, 3)
                else:
                    self.status = SimulationStatusEnum.ACQUIRING

            elif self.status == SimulationStatusEnum.ACQUIRING:
                if self.consecutive_hits >= self.acquire_needed:
                    self.status = SimulationStatusEnum.TRACKING
                    if self.acquisition_time is None and self.search_start_time is not None:
                        self.acquisition_time = round(now - self.search_start_time, 3)

            elif self.status == SimulationStatusEnum.TARGET_LOST:
                # Target reappeared after loss; enter RE_ACQUIRING to verify stable persistence
                self.status = SimulationStatusEnum.RE_ACQUIRING
                if self.consecutive_hits >= self.reacquire_needed:
                    self.status = SimulationStatusEnum.TRACKING
                    if self.lost_start_time is not None:
                        self.reacquisition_time = round(now - self.lost_start_time, 3)
                        self.lost_start_time = None

            elif self.status == SimulationStatusEnum.RE_ACQUIRING:
                # Require stable consecutive detections before restoring TRACKING status
                if self.consecutive_hits >= self.reacquire_needed:
                    self.status = SimulationStatusEnum.TRACKING
                    if self.lost_start_time is not None:
                        self.reacquisition_time = round(now - self.lost_start_time, 3)
                        self.lost_start_time = None

        else:  # Missed detection
            self.consecutive_misses += 1
            self.consecutive_hits = 0

            if self.status == SimulationStatusEnum.TRACKING:
                if self.consecutive_misses <= self.coast_thresh:
                    # Momentary optical dropout / noise burst: coast on Kalman filter prediction
                    target_pos = (pred_x, pred_y) if self.kalman.initialized else None
                    confidence = max(0.2, 0.75 - 0.05 * self.consecutive_misses)
                else:
                    # Sustained dropout: enter RE_ACQUIRING mode and record loss event
                    self.target_loss_events += 1
                    self.lost_start_time = now
                    self.status = SimulationStatusEnum.RE_ACQUIRING
                    target_pos = (pred_x, pred_y) if self.kalman.initialized else None
                    confidence = max(0.1, 0.7 - 0.05 * self.consecutive_misses)

            elif self.status == SimulationStatusEnum.RE_ACQUIRING:
                if self.consecutive_misses > self.lost_thresh:
                    # Coasting window expired: declare TARGET_LOST
                    self.status = SimulationStatusEnum.TARGET_LOST
                    target_pos = None
                    confidence = 0.0
                else:
                    # Continue coasting on Kalman prediction
                    target_pos = (pred_x, pred_y) if self.kalman.initialized else None
                    confidence = max(0.05, 0.7 - 0.05 * self.consecutive_misses)

            elif self.status == SimulationStatusEnum.TARGET_LOST:
                target_pos = None
                confidence = 0.0

            elif self.status == SimulationStatusEnum.ACQUIRING:
                self.status = SimulationStatusEnum.SEARCHING
                target_pos = None
                confidence = 0.0

            else:
                self.status = SimulationStatusEnum.SEARCHING
                target_pos = None
                confidence = 0.0

        # 5. Compute tracking error relative to camera optical axis
        cx, cy = self.camera_center
        if target_pos is not None:
            err_x = round(target_pos[0] - cx, 2)
            err_y = round(target_pos[1] - cy, 2)
            err_mag = round(math.hypot(err_x, err_y), 2)
        else:
            err_x = 0.0
            err_y = 0.0
            err_mag = 0.0

        if self.kalman.initialized:
            vx, vy = self.kalman.get_velocity()
            vel_x = round(float(vx), 2)
            vel_y = round(float(vy), 2)
            k_state = "UPDATED" if target_detected else "COASTING"
        else:
            vel_x = 0.0
            vel_y = 0.0
            k_state = "INITIALIZING"

        return TrackResult(
            status=self.status,
            target_detected=target_detected,
            target_pos=target_pos,
            predicted_pos=(round(pred_x, 2), round(pred_y, 2)) if self.kalman.initialized else None,
            error_x=err_x,
            error_y=err_y,
            error_magnitude=err_mag,
            confidence=confidence,
            uncertainty=round(uncertainty, 2),
            all_candidates=candidates,
            detector_mode=active_mode,
            ai_confidence=ai_conf,
            ai_inference_ms=ai_inference_ms,
            velocity_x=vel_x,
            velocity_y=vel_y,
            kalman_state=k_state,
        )
