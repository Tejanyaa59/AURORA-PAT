"""Sub-pixel centroid and spatial moment estimation for optical beacons."""

import math
from typing import Optional, Tuple
import cv2
import numpy as np


def compute_weighted_centroid(
    roi: np.ndarray, offset_x: int = 0, offset_y: int = 0
) -> Optional[Tuple[float, float, float]]:
    """Compute sub-pixel intensity-weighted centroid using spatial moments.
    
    Returns:
        (cx, cy, peak_intensity) or None if ROI is empty.
    """
    if roi.size == 0:
        return None

    # Threshold background noise within the ROI to prevent floor bias
    max_val = float(np.max(roi))
    if max_val < 30.0:
        return None

    # Noise floor cutoff at 25% of peak
    cutoff = max_val * 0.25
    weighted = np.where(roi > cutoff, roi - cutoff, 0.0).astype(np.float64)

    moments = cv2.moments(weighted)
    m00 = moments["m00"]
    if m00 <= 1e-6:
        return None

    cx = (moments["m10"] / m00) + offset_x
    cy = (moments["m01"] / m00) + offset_y
    return float(cx), float(cy), max_val


def compute_circularity(contour: np.ndarray) -> float:
    """Compute circularity metric 4*pi*A / P^2 (1.0 = perfect circle)."""
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, closed=True)
    if perimeter <= 1e-5 or area <= 0.0:
        return 0.0
    return float((4.0 * math.pi * area) / (perimeter * perimeter))
