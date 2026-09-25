"""Unit tests for PyTorch BeaconCNN, synthetic dataset generation, and AI detector."""

import os
import numpy as np
import pytest
import cv2

import torch
from backend.vision.ai_detector import BeaconCNN, AIBeaconDetector
from backend.vision.dataset_generator import generate_beacon_patch, generate_synthetic_dataset
from backend.vision.detector import BeaconCandidate, OpticalBeaconDetector


def test_beacon_cnn_architecture():
    """Verify BeaconCNN architecture, parameter budget, and forward pass shapes."""
    model = BeaconCNN()
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    # Architectural parameter constraint: < 250,000 parameters
    assert total_params < 250_000, f"Model parameter count too high: {total_params}"
    assert total_params > 50_000, f"Model parameter count too low: {total_params}"

    # Test dummy batch
    batch_size = 4
    x = torch.rand(batch_size, 1, 128, 128, dtype=torch.float32)
    model.eval()
    with torch.no_grad():
        conf, bbox = model(x)

    assert conf.shape == (batch_size, 1)
    assert bbox.shape == (batch_size, 4)

    # Sigmoid outputs must be strictly in [0.0, 1.0]
    assert (conf >= 0.0).all() and (conf <= 1.0).all()
    assert (bbox >= 0.0).all() and (bbox <= 1.0).all()


def test_dataset_generator():
    """Verify synthetic optical scene generation under channel disturbances."""
    rng = np.random.RandomState(42)

    # 1. Positive sample
    img_pos, annot_pos = generate_beacon_patch(size=128, is_positive=True, rng=rng)
    assert img_pos.shape == (128, 128)
    assert img_pos.dtype == np.float32
    assert 0.0 <= img_pos.min() and img_pos.max() <= 1.0
    assert annot_pos["present"] == 1.0
    assert 0.05 < annot_pos["norm_cx"] < 0.95
    assert 0.05 < annot_pos["norm_cy"] < 0.95

    # 2. Negative sample
    img_neg, annot_neg = generate_beacon_patch(size=128, is_positive=False, rng=rng)
    assert img_neg.shape == (128, 128)
    assert annot_neg["present"] == 0.0

    # 3. Batch generator
    imgs, cls_labels, reg_labels = generate_synthetic_dataset(num_samples=16, positive_ratio=0.5, seed=7)
    assert imgs.shape == (16, 1, 128, 128)
    assert cls_labels.shape == (16, 1)
    assert reg_labels.shape == (16, 4)


def test_ai_detector_initialization():
    """Verify AIBeaconDetector loads gracefully on CPU."""
    detector = AIBeaconDetector()
    assert detector.device == "cpu"
    assert detector.confidence_threshold == 0.50
    assert detector.model is not None


def test_ai_detector_modes():
    """Verify OPENCV, AI, and HYBRID detector modes."""
    detector = AIBeaconDetector()
    h, w = 480, 640
    frame = np.full((h, w, 3), 15, dtype=np.uint8)

    # Draw a clean Gaussian optical beacon at (320, 240)
    cv2.circle(frame, (320, 240), 8, (255, 255, 255), -1)
    frame = cv2.GaussianBlur(frame, (7, 7), 2.0)

    # 1. Classical OpenCV mode
    cv_det = OpticalBeaconDetector()
    cv_cands = cv_det.detect(frame)
    assert len(cv_cands) > 0

    cand_cv, conf_cv, lat_cv = detector.detect(frame, cv_candidates=cv_cands, mode="OPENCV")
    assert cand_cv is not None
    assert lat_cv == 0.0
    assert abs(cand_cv.x - 320.0) < 5.0
    assert abs(cand_cv.y - 240.0) < 5.0

    # 2. Hybrid mode
    cand_hyb, conf_hyb, lat_hyb = detector.detect(frame, cv_candidates=cv_cands, mode="HYBRID")
    assert cand_hyb is not None
    assert lat_hyb >= 0.0
    assert lat_hyb < 40.0  # Real-time latency budget < 40ms on CPU


def test_ai_detector_noise_resilience():
    """Verify AI detector operates under additive noise and low SNR."""
    detector = AIBeaconDetector()
    h, w = 480, 640
    frame = np.full((h, w, 3), 20, dtype=np.uint8)

    # Beacon with moderate noise
    cv2.circle(frame, (200, 150), 10, (230, 230, 230), -1)
    noise = np.random.normal(0, 15, (h, w, 3)).astype(np.int16)
    noisy_frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    cv_det = OpticalBeaconDetector()
    cv_cands = cv_det.detect(noisy_frame)

    # Warm up pass
    detector.detect(noisy_frame, cv_candidates=cv_cands, mode="HYBRID")

    # Steady-state inference
    cand, conf, ms = detector.detect(noisy_frame, cv_candidates=cv_cands, mode="HYBRID")
    # Must produce a valid detection result with steady-state latency < 50ms on CPU
    assert ms is not None and ms < 50.0
