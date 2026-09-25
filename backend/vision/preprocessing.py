"""Frame synthesis, preprocessing, and encoding for optical tracking."""

import base64
import math
from typing import List, Optional, Tuple
import cv2
import numpy as np
from backend.simulation.target import TargetInstance


def render_optical_scene(
    width: int,
    height: int,
    targets: List[TargetInstance],
    scintillation_factor: float = 1.0,
) -> np.ndarray:
    """Render simulated focal plane array image with Gaussian optical beacon spots."""
    # Dark optical aperture background with slight sensor dark-current bias
    frame = np.full((height, width), 16, dtype=np.uint8)

    for target in targets:
        if not target.is_in_fov or target.cam_x is None or target.cam_y is None:
            continue

        cx = target.cam_x
        cy = target.cam_y
        beacon_radius = max(3.0, target.beacon_size / 2.0)

        # Scintillation modulates peak intensity (180 to 255)
        base_intensity = 240.0 if target.designated else 210.0
        peak_intensity = min(255.0, base_intensity * scintillation_factor)

        # Gaussian radius footprint (3-sigma ~ beacon_radius * 2.5)
        patch_r = int(math.ceil(beacon_radius * 2.8))
        x0 = max(0, int(math.floor(cx - patch_r)))
        x1 = min(width, int(math.ceil(cx + patch_r + 1)))
        y0 = max(0, int(math.floor(cy - patch_r)))
        y1 = min(height, int(math.ceil(cy + patch_r + 1)))

        if x1 <= x0 or y1 <= y0:
            continue

        # Grid of coordinates in patch
        grid_y, grid_x = np.ogrid[y0:y1, x0:x1]
        dist_sq = (grid_x - cx) ** 2 + (grid_y - cy) ** 2
        sigma_sq = max(1.0, (beacon_radius / 1.5) ** 2)

        # 2D Gaussian spot intensity
        spot = peak_intensity * np.exp(-0.5 * dist_sq / sigma_sq)
        spot_clipped = np.clip(spot, 0, 255).astype(np.uint8)

        # Additive blend onto sensor plane
        frame[y0:y1, x0:x1] = np.maximum(frame[y0:y1, x0:x1], spot_clipped)

    # Convert to 3-channel BGR image
    bgr_frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    return bgr_frame


def preprocess_optical_frame(bgr_frame: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Convert to grayscale, filter high-frequency noise, and compute binary mask.
    
    Returns:
        (gray_blurred, binary_thresh)
    """
    if len(bgr_frame.shape) == 3:
        gray = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = bgr_frame.copy()

    # Mild Gaussian filter to eliminate single-pixel spikes without shifting beacon centroid
    blurred = cv2.GaussianBlur(gray, (3, 3), 0.8)

    # Dynamic thresholding: compute background mean and std
    mean_val, std_val = cv2.meanStdDev(blurred)
    # Beacons stand out well above the noise floor
    thresh_val = max(55.0, float(mean_val[0][0] + 2.5 * std_val[0][0]))
    thresh_val = min(thresh_val, 210.0)

    _, binary = cv2.threshold(blurred, int(thresh_val), 255, cv2.THRESH_BINARY)

    # Morphological opening to remove tiny noise flecks
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    cleaned_binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    return blurred, cleaned_binary


def encode_frame_to_base64(frame: np.ndarray, quality: int = 75) -> str:
    """Encode OpenCV BGR frame into base64 JPEG string."""
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    success, buffer = cv2.imencode(".jpg", frame, encode_params)
    if not success:
        return ""
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"
