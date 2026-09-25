"""Synthetic FSOC Optical Beacon Dataset Generator.

Generates realistic 128x128 single-channel frames with Gaussian optical beacons,
atmospheric scintillation, turbulence blur, solar glare, noise, and cloud attenuation.
Produces both positive (beacon present) and negative (background/distractors) samples
for training and evaluating the lightweight BeaconCNN.
"""

from typing import Dict, Tuple, Optional
import numpy as np
import cv2


def generate_beacon_patch(
    size: int = 128,
    is_positive: bool = True,
    rng: Optional[np.random.RandomState] = None,
) -> Tuple[np.ndarray, Dict[str, float]]:
    """Generate a single 128x128 optical patch with annotations.

    Returns:
        image: (128, 128) float32 array normalized to [0.0, 1.0]
        annotation: dict with keys:
            'present': 1.0 if beacon present, 0.0 otherwise
            'norm_cx': normalized center X in [0.0, 1.0]
            'norm_cy': normalized center Y in [0.0, 1.0]
            'norm_w': normalized bounding box width
            'norm_h': normalized bounding box height
    """
    if rng is None:
        rng = np.random.RandomState()

    # Dark background baseline (simulating camera sensor in space/sky)
    bg_level = rng.uniform(3.0, 20.0)
    image = np.full((size, size), bg_level, dtype=np.float32)

    # Ambient gradient (stray ambient light / dusk / dawn / lunar scatter)
    if rng.rand() < 0.6:
        gx = np.linspace(rng.uniform(-5, 5), rng.uniform(-5, 5), size, dtype=np.float32)
        gy = np.linspace(rng.uniform(-5, 5), rng.uniform(-5, 5), size, dtype=np.float32)
        image += gx[None, :] + gy[:, None]

    # Atmospheric haze / fog offset
    if rng.rand() < 0.4:
        haze_val = rng.uniform(10.0, 45.0)
        image += haze_val

    # Solar flare / diffuse reflection (distractor)
    if rng.rand() < 0.35:
        flare_cx = rng.uniform(0, size)
        flare_cy = rng.uniform(0, size)
        flare_radius = rng.uniform(25.0, 60.0)
        y_grid, x_grid = np.ogrid[:size, :size]
        dist_sq = (x_grid - flare_cx) ** 2 + (y_grid - flare_cy) ** 2
        flare_peak = rng.uniform(40.0, 120.0)
        flare = flare_peak * np.exp(-dist_sq / (2.0 * (flare_radius ** 2)))
        image += flare.astype(np.float32)

    # Weak star / clutter speckles (false point sources)
    if rng.rand() < 0.5:
        num_stars = rng.randint(1, 6)
        for _ in range(num_stars):
            sx = rng.uniform(5, size - 5)
            sy = rng.uniform(5, size - 5)
            s_rad = rng.uniform(0.8, 1.8)
            s_peak = rng.uniform(25.0, 65.0)  # dimmer than beacon
            y_grid, x_grid = np.ogrid[:size, :size]
            s_dist = (x_grid - sx) ** 2 + (y_grid - sy) ** 2
            image += (s_peak * np.exp(-s_dist / (2.0 * (s_rad ** 2)))).astype(np.float32)

    # Initialize annotations
    annotation = {
        "present": 0.0,
        "norm_cx": 0.5,
        "norm_cy": 0.5,
        "norm_w": 0.0,
        "norm_h": 0.0,
    }

    if is_positive:
        # Optical beacon parameters
        cx = rng.uniform(14.0, size - 14.0)
        cy = rng.uniform(14.0, size - 14.0)
        radius = rng.uniform(3.0, 12.0)
        peak_intensity = rng.uniform(150.0, 255.0)

        # Scintillation / cloud attenuation factor
        attenuation = rng.uniform(0.55, 1.0)
        effective_peak = peak_intensity * attenuation

        # Ellipticity (beam divergence off-axis)
        eccentricity_x = rng.uniform(0.85, 1.15)
        eccentricity_y = rng.uniform(0.85, 1.15)
        sigma_x = (radius / 2.2) * eccentricity_x
        sigma_y = (radius / 2.2) * eccentricity_y

        y_grid, x_grid = np.ogrid[:size, :size]
        beacon_dist = ((x_grid - cx) ** 2) / (2.0 * (sigma_x ** 2)) + ((y_grid - cy) ** 2) / (2.0 * (sigma_y ** 2))
        beacon_profile = effective_peak * np.exp(-beacon_dist)

        image += beacon_profile.astype(np.float32)

        # Bounding box normalized
        bbox_w = (radius * 2.5) / float(size)
        bbox_h = (radius * 2.5) / float(size)

        annotation["present"] = 1.0
        annotation["norm_cx"] = float(cx / size)
        annotation["norm_cy"] = float(cy / size)
        annotation["norm_w"] = float(np.clip(bbox_w, 0.02, 0.4))
        annotation["norm_h"] = float(np.clip(bbox_h, 0.02, 0.4))

    # Add Gaussian sensor noise
    noise_sigma = rng.uniform(2.0, 12.0)
    noise = rng.normal(0.0, noise_sigma, (size, size)).astype(np.float32)
    image += noise

    # Add dead / hot pixels (shot noise)
    if rng.rand() < 0.3:
        num_bad_pixels = rng.randint(1, 5)
        for _ in range(num_bad_pixels):
            px = rng.randint(0, size)
            py = rng.randint(0, size)
            image[py, px] = rng.choice([0.0, 255.0])

    # Atmospheric blur (diffraction / aero-optical turbulence)
    if rng.rand() < 0.4:
        k_size = rng.choice([3, 5])
        image = cv2.GaussianBlur(image, (k_size, k_size), rng.uniform(0.6, 1.8))

    # Clip pixel values to [0, 255] and normalize to [0.0, 1.0]
    image = np.clip(image, 0.0, 255.0) / 255.0
    return image.astype(np.float32), annotation


def generate_synthetic_dataset(
    num_samples: int = 1600,
    positive_ratio: float = 0.75,
    seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Generate a full training/validation dataset for the BeaconCNN.

    Returns:
        images: (N, 1, 128, 128) float32 in [0.0, 1.0]
        labels_cls: (N, 1) float32 (1.0 or 0.0)
        labels_reg: (N, 4) float32 [norm_cx, norm_cy, norm_w, norm_h]
    """
    rng = np.random.RandomState(seed)
    images = np.zeros((num_samples, 1, 128, 128), dtype=np.float32)
    labels_cls = np.zeros((num_samples, 1), dtype=np.float32)
    labels_reg = np.zeros((num_samples, 4), dtype=np.float32)

    for i in range(num_samples):
        is_pos = rng.rand() < positive_ratio
        img, annot = generate_beacon_patch(size=128, is_positive=is_pos, rng=rng)
        images[i, 0, :, :] = img
        labels_cls[i, 0] = annot["present"]
        labels_reg[i] = [
            annot["norm_cx"],
            annot["norm_cy"],
            annot["norm_w"],
            annot["norm_h"],
        ]

    return images, labels_cls, labels_reg
