"""Blur disturbances for optical sensor and gimbal slewing simulation."""

import cv2
import numpy as np


def apply_motion_blur(image: np.ndarray, intensity: float, angle_deg: float = 45.0) -> np.ndarray:
    """Simulate motion smear caused by rapid gimbal slew or terminal velocity."""
    if intensity <= 0.0:
        return image

    kernel_size = int(1 + 2 * round(intensity * 10))  # 3 to 21 pixels
    if kernel_size <= 1:
        return image

    # Generate linear motion blur kernel
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    center = kernel_size // 2
    # Draw line across kernel at angle_deg
    rad = np.deg2rad(angle_deg)
    dx = int(center * np.cos(rad))
    dy = int(center * np.sin(rad))
    cv2.line(kernel, (center - dx, center - dy), (center + dx, center + dy), 1.0, thickness=1)
    kernel_sum = kernel.sum()
    if kernel_sum > 0:
        kernel /= kernel_sum

    return cv2.filter2D(image, -1, kernel)


def apply_defocus_blur(image: np.ndarray, intensity: float) -> np.ndarray:
    """Simulate receiver optics defocusing or atmospheric phase aberration."""
    if intensity <= 0.0:
        return image
    ksize = int(1 + 2 * round(intensity * 6))  # 3, 5, 7, 9, 11, 13
    if ksize <= 1:
        return image
    sigma = intensity * 3.0
    return cv2.GaussianBlur(image, (ksize, ksize), sigma)
