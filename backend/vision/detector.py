"""Real OpenCV optical beacon detector and HUD annotation overlays."""

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple
import cv2
import numpy as np
from backend.vision.centroid import compute_circularity, compute_weighted_centroid
from backend.vision.preprocessing import preprocess_optical_frame


@dataclass
class BeaconCandidate:
    """Detected candidate beacon on focal plane array."""
    x: float
    y: float
    bbox_x: int
    bbox_y: int
    bbox_w: int
    bbox_h: int
    area: float
    peak_intensity: float
    circularity: float
    confidence: float


class OpticalBeaconDetector:
    """Computer vision detector identifying optical FSOC beacons."""

    def __init__(self, min_area: float = 4.0, max_area: float = 1200.0):
        self.min_area = min_area
        self.max_area = max_area

    def detect(self, bgr_frame: np.ndarray) -> List[BeaconCandidate]:
        """Detect all beacon candidates in the frame."""
        gray, binary = preprocess_optical_frame(bgr_frame)

        # Connected component contours
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        candidates: List[BeaconCandidate] = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < self.min_area or area > self.max_area:
                continue

            bx, by, bw, bh = cv2.boundingRect(cnt)
            # Expand ROI slightly for subpixel centroiding
            pad = 2
            h, w = gray.shape
            rx0 = max(0, bx - pad)
            ry0 = max(0, by - pad)
            rx1 = min(w, bx + bw + pad)
            ry1 = min(h, by + bh + pad)

            roi = gray[ry0:ry1, rx0:rx1]
            centroid_res = compute_weighted_centroid(roi, rx0, ry0)
            if centroid_res is None:
                continue

            cx, cy, peak_val = centroid_res
            circ = compute_circularity(cnt)

            # Confidence score combining intensity, circularity, and shape aspect ratio
            aspect = float(min(bw, bh)) / max(bw, bh, 1)
            intensity_score = min(1.0, peak_val / 220.0)
            circ_score = min(1.0, max(0.0, circ))
            aspect_score = min(1.0, aspect)

            conf = 0.50 * intensity_score + 0.30 * circ_score + 0.20 * aspect_score
            conf = round(max(0.0, min(1.0, conf)), 3)

            candidates.append(
                BeaconCandidate(
                    x=round(cx, 2),
                    y=round(cy, 2),
                    bbox_x=bx,
                    bbox_y=by,
                    bbox_w=bw,
                    bbox_h=bh,
                    area=round(area, 1),
                    peak_intensity=round(peak_val, 1),
                    circularity=round(circ, 2),
                    confidence=conf,
                )
            )

        # Sort candidates by confidence descending
        candidates.sort(key=lambda c: c.confidence, reverse=True)
        return candidates


def draw_hud(
    frame: np.ndarray,
    status: str,
    target_pos: Optional[Tuple[float, float]],
    predicted_pos: Optional[Tuple[float, float]],
    confidence: float,
    pan_deg: float,
    tilt_deg: float,
    fps: float,
    alignment_radius_px: float = 24.0,
    detector_mode: str = "HYBRID",
    ai_confidence: Optional[float] = None,
    ai_inference_ms: Optional[float] = None,
) -> np.ndarray:
    """Render tactical HUD overlays, reticles, and alignment status onto the camera frame."""
    out = frame.copy()
    h, w = out.shape[:2]
    cx, cy = int(w / 2), int(h / 2)

    # 1. Draw central optical reticle
    reticle_color = (0, 180, 255)  # Amber/cyan
    cv2.circle(out, (cx, cy), 4, reticle_color, -1)
    cv2.circle(out, (cx, cy), int(alignment_radius_px), (50, 150, 50), 1)  # Coarse alignment ring

    # Crosshair tick marks
    tick_len = 12
    gap = 8
    cv2.line(out, (cx - gap - tick_len, cy), (cx - gap, cy), reticle_color, 1)
    cv2.line(out, (cx + gap, cy), (cx + gap + tick_len, cy), reticle_color, 1)
    cv2.line(out, (cx, cy - gap - tick_len), (cx, cy - gap), reticle_color, 1)
    cv2.line(out, (cx, cy + gap), (cx, cy + gap + tick_len), reticle_color, 1)

    # 2. Draw Kalman prediction marker if available
    if predicted_pos is not None:
        px, py = int(predicted_pos[0]), int(predicted_pos[1])
        if 0 <= px < w and 0 <= py < h:
            cv2.drawMarker(
                out, (px, py), (255, 200, 0), cv2.MARKER_TILTED_CROSS, 10, 1
            )

    # 3. Draw Target Lock / Detection Box
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.40
    if target_pos is not None:
        tx, ty = int(target_pos[0]), int(target_pos[1])
        if 0 <= tx < w and 0 <= ty < h:
            # Color code based on status
            if "TRACKING" in status or "LOCKED" in status:
                box_color = (0, 255, 0)  # Green
            elif "ACQUIRING" in status:
                box_color = (0, 255, 255)  # Yellow
            else:
                box_color = (0, 140, 255)  # Orange

            box_size = 14
            cv2.rectangle(
                out,
                (tx - box_size, ty - box_size),
                (tx + box_size, ty + box_size),
                box_color,
                1,
            )
            # Corner accents
            c_len = 4
            cv2.line(out, (tx - box_size, ty - box_size), (tx - box_size + c_len, ty - box_size), box_color, 2)
            cv2.line(out, (tx - box_size, ty - box_size), (tx - box_size, ty - box_size + c_len), box_color, 2)
            cv2.line(out, (tx + box_size, ty - box_size), (tx + box_size - c_len, ty - box_size), box_color, 2)
            cv2.line(out, (tx + box_size, ty - box_size), (tx + box_size, ty - box_size + c_len), box_color, 2)

            # Error vector line from center to target
            cv2.line(out, (cx, cy), (tx, ty), (220, 220, 0), 1, cv2.LINE_AA)

            # Centroid point
            cv2.circle(out, (tx, ty), 2, (0, 255, 0), -1)

            # Label on target box
            tag = f"LOCK {confidence * 100:.0f}%"
            cv2.putText(out, tag, (tx - box_size, max(12, ty - box_size - 4)), font, 0.35, box_color, 1, cv2.LINE_AA)

    # 4. HUD Telemetry overlay text
    color = (220, 220, 220)
    bg_bar_h = 24

    # Top status bar
    cv2.rectangle(out, (0, 0), (w, bg_bar_h), (20, 20, 20), -1)
    status_text = f"FSOC LOS | STATE: {status} | FPS: {fps:.1f}"
    cv2.putText(out, status_text, (10, 16), font, scale, (0, 255, 180), 1, cv2.LINE_AA)

    # AI Detector mode badge in top bar
    if detector_mode == "AI":
        det_text = f"DET: AI {((ai_confidence or confidence) * 100):.0f}% ({ai_inference_ms or 0.0:.1f}ms)"
        det_color = (0, 255, 128)
    elif detector_mode == "HYBRID":
        det_text = f"DET: HYBRID {((ai_confidence or confidence) * 100):.0f}% ({ai_inference_ms or 0.0:.1f}ms)"
        det_color = (255, 220, 0)
    else:
        det_text = "DET: OPENCV (CLASSICAL)"
        det_color = (0, 180, 255)

    det_size = cv2.getTextSize(det_text, font, scale, 1)[0]
    cv2.putText(out, det_text, (w - det_size[0] - 10, 16), font, scale, det_color, 1, cv2.LINE_AA)

    # Bottom telemetry bar
    cv2.rectangle(out, (0, h - bg_bar_h), (w, h), (20, 20, 20), -1)
    err_text = ""
    if target_pos is not None:
        err_px = math.hypot(target_pos[0] - cx, target_pos[1] - cy)
        err_text = f"ERR: {err_px:.1f}px | CONF: {confidence:.2f} | "
    gimbal_text = f"{err_text}PAN: {pan_deg:+.2f}deg | TILT: {tilt_deg:+.2f}deg"
    cv2.putText(out, gimbal_text, (10, h - 7), font, scale, color, 1, cv2.LINE_AA)

    return out
