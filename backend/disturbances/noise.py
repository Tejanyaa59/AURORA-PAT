"""Noise disturbances for optical sensor simulation."""

import cv2
import numpy as np


def apply_gaussian_noise(image: np.ndarray, intensity: float) -> np.ndarray:
    """Add Gaussian zero-mean sensor read noise."""
    if intensity <= 0.0:
        return image
    # Standard deviation proportional to intensity
    sigma = intensity * 45.0
    noise = np.zeros(image.shape, dtype=np.int16)
    cv2.randn(noise, 0, sigma)
    noisy = np.clip(image.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return noisy


def apply_salt_pepper_noise(image: np.ndarray, intensity: float) -> np.ndarray:
    """Add impulse (salt & pepper) noise representing defective/hot pixels."""
    if intensity <= 0.0:
        return image
    prob = intensity * 0.04  # Up to 4% damaged pixels
    noisy = image.copy()
    rnd = np.random.rand(*image.shape[:2])

    # Pepper (dark dead pixel)
    noisy[rnd < (prob / 2.0)] = 0
    # Salt (bright saturated pixel)
    noisy[rnd > (1.0 - prob / 2.0)] = 255

    return noisy
