"""Atmospheric disturbances for free-space optical channel simulation."""

import math
import cv2
import numpy as np


def apply_haze_fog(image: np.ndarray, intensity: float) -> np.ndarray:
    """Aerosol scattering model: I = J * t + A * (1 - t)."""
    if intensity <= 0.0:
        return image
    # Atmospheric transmission factor: lower transmission = denser fog
    transmission = max(0.2, 1.0 - 0.75 * intensity)
    atmospheric_light = 200.0  # Bright sky haze

    img_float = image.astype(np.float32)
    hazy = img_float * transmission + atmospheric_light * (1.0 - transmission)
    return np.clip(hazy, 0, 255).astype(np.uint8)


def apply_rain(image: np.ndarray, intensity: float) -> np.ndarray:
    """Simulate atmospheric precipitation (rain streaks) across the receiver aperture."""
    if intensity <= 0.0:
        return image

    num_drops = int(intensity * 350)
    if num_drops <= 0:
        return image

    h, w = image.shape[:2]
    rain_layer = np.zeros((h, w), dtype=np.uint8)

    # Random streak coordinates
    xs = np.random.randint(0, w, num_drops)
    ys = np.random.randint(0, h, num_drops)
    lengths = np.random.randint(10, 25, num_drops)

    for x, y, length in zip(xs, ys, lengths):
        # Rain streaks tilted by wind (~75 degrees)
        x2 = min(w - 1, x + int(length * 0.25))
        y2 = min(h - 1, y + length)
        cv2.line(rain_layer, (x, y), (x2, y2), 180, thickness=1)

    # Blur rain streaks slightly for realistic optical depth
    rain_layer = cv2.GaussianBlur(rain_layer, (3, 3), 0.5)

    if len(image.shape) == 3:
        rain_layer = cv2.cvtColor(rain_layer, cv2.COLOR_GRAY2BGR)

    blended = cv2.add(image, rain_layer)
    return blended


def apply_illumination(
    image: np.ndarray,
    brightness_intensity: float = 0.0,
    contrast_intensity: float = 0.0,
    low_light_intensity: float = 0.0,
) -> np.ndarray:
    """Apply ambient brightness, contrast degradation, and low-light attenuation."""
    img = image.astype(np.float32)

    # Low-light attenuation (attenuates entire image down to 20% intensity)
    if low_light_intensity > 0.0:
        attenuation = max(0.15, 1.0 - 0.85 * low_light_intensity)
        img *= attenuation

    # Contrast variation (decreases contrast when intensity is high)
    if contrast_intensity > 0.0:
        factor = max(0.2, 1.0 - 0.8 * contrast_intensity)
        mean_val = np.mean(img)
        img = mean_val + factor * (img - mean_val)

    # Brightness variation (adds ambient offset)
    if brightness_intensity > 0.0:
        offset = (brightness_intensity - 0.5) * 60.0
        img += offset

    return np.clip(img, 0, 255).astype(np.uint8)


def get_scintillation_factor(t: float, intensity: float) -> float:
    """Rytov approximation for log-amplitude variance in atmospheric turbulence.
    
    Returns multiplier for optical beacon intensity (e.g. 0.3 to 1.8).
    """
    if intensity <= 0.0:
        return 1.0

    # Multi-frequency turbulent fluctuations
    f1 = 8.5
    f2 = 14.3
    f3 = 23.1
    fluc = (
        0.5 * math.sin(2.0 * math.pi * f1 * t)
        + 0.3 * math.sin(2.0 * math.pi * f2 * t + 1.2)
        + 0.2 * math.cos(2.0 * math.pi * f3 * t + 2.7)
    )
    # Log-normal intensity multiplier
    sigma_r = intensity * 0.7  # Scintillation index
    factor = math.exp(-0.5 * sigma_r * sigma_r + sigma_r * fluc)
    return max(0.05, min(2.5, factor))
