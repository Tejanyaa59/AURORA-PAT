"""Validation script to evaluate the trained BeaconCNN on unseen synthetic samples.

Measures:
1. Classification detection accuracy (%)
2. Localization error (mean, median, max pixel error on 128x128 and 640x480 frame)
3. Confidence distribution (positives vs negatives)
4. Actual CPU inference latency (measured in milliseconds)

CRITICAL: Ground truth is used ONLY for evaluation scoring, NEVER as runtime output.
"""

import os
import sys
import time
import numpy as np
import cv2
import torch

from backend.vision.dataset_generator import generate_beacon_patch, generate_synthetic_dataset
from backend.vision.ai_detector import BeaconCNN, AIBeaconDetector


def validate_trained_beacon_cnn(
    num_test_samples: int = 300,
    seed: int = 9999,
    model_path: str = "backend/models/beacon_detector.pth",
) -> dict:
    print(f"\n==================================================================")
    print(f"EVALUATING TRAINED BEACON CNN ON {num_test_samples} UNSEEN SAMPLES (seed={seed})")
    print(f"==================================================================")

    if not os.path.isfile(model_path):
        raise FileNotFoundError(f"Model checkpoint not found at: {model_path}")

    # Load detector
    detector = AIBeaconDetector(model_path=model_path, device="cpu")
    if not detector.loaded or detector.model is None:
        raise RuntimeError("Failed to load model into AIBeaconDetector!")

    rng = np.random.RandomState(seed)

    latencies_ms = []
    correct_classifications = 0
    pos_confidences = []
    neg_confidences = []
    pixel_errors_128 = []
    pixel_errors_640 = []

    # Warmup
    dummy = np.zeros((480, 640, 3), dtype=np.uint8)
    detector.detect(dummy, mode="AI")

    for i in range(num_test_samples):
        is_positive = rng.rand() < 0.70
        patch_128, annot = generate_beacon_patch(size=128, is_positive=is_positive, rng=rng)

        # Upscale patch to 640x480 camera frame so we test the full runtime pipeline
        frame_640 = cv2.resize((patch_128 * 255.0).astype(np.uint8), (640, 480))
        frame_bgr = cv2.cvtColor(frame_640, cv2.COLOR_GRAY2BGR)

        # RUN TIME AI DETECTION (ZERO ground truth passed to detector!)
        cand, ai_conf, lat_ms = detector.detect(frame_bgr, cv_candidates=None, mode="AI")

        latencies_ms.append(lat_ms)

        # Evaluation scoring
        gt_present = annot["present"] > 0.5
        detected = cand is not None

        if gt_present:
            pos_confidences.append(ai_conf)
            if detected:
                correct_classifications += 1
                # Calculate localization error against ground truth
                gt_x_640 = annot["norm_cx"] * 640.0
                gt_y_640 = annot["norm_cy"] * 480.0
                err_640 = np.hypot(cand.x - gt_x_640, cand.y - gt_y_640)
                err_128 = np.hypot(
                    (cand.x / 640.0 * 128.0) - (annot["norm_cx"] * 128.0),
                    (cand.y / 480.0 * 128.0) - (annot["norm_cy"] * 128.0),
                )
                pixel_errors_640.append(err_640)
                pixel_errors_128.append(err_128)
            else:
                # Missed detection: error is distance from frame center or penalty
                pass
        else:
            neg_confidences.append(ai_conf)
            if not detected:
                correct_classifications += 1

    total_samples = num_test_samples
    accuracy_pct = (correct_classifications / total_samples) * 100.0
    mean_lat = float(np.mean(latencies_ms))
    p95_lat = float(np.percentile(latencies_ms, 95))
    min_lat = float(np.min(latencies_ms))
    max_lat = float(np.max(latencies_ms))

    mean_err_128 = float(np.mean(pixel_errors_128)) if pixel_errors_128 else 0.0
    median_err_128 = float(np.median(pixel_errors_128)) if pixel_errors_128 else 0.0
    mean_err_640 = float(np.mean(pixel_errors_640)) if pixel_errors_640 else 0.0
    median_err_640 = float(np.median(pixel_errors_640)) if pixel_errors_640 else 0.0

    mean_pos_conf = float(np.mean(pos_confidences)) if pos_confidences else 0.0
    mean_neg_conf = float(np.mean(neg_confidences)) if neg_confidences else 0.0

    print(f"\n--- VALIDATION RESULTS ON UNSEEN DATA ---")
    print(f"Overall Detection Accuracy:        {accuracy_pct:.1f}%")
    print(f"Mean Confidence (Positives):       {mean_pos_conf*100:.1f}%")
    print(f"Mean Confidence (Negatives):       {mean_neg_conf*100:.1f}%")
    print(f"Localization Error (128x128 grid): Mean: {mean_err_128:.2f} px | Median: {median_err_128:.2f} px")
    print(f"Localization Error (640x480 frame): Mean: {mean_err_640:.2f} px | Median: {median_err_640:.2f} px")
    print(f"Actual Measured CPU Latency:       Mean: {mean_lat:.2f} ms | Min: {min_lat:.2f} ms | Max: {max_lat:.2f} ms | P95: {p95_lat:.2f} ms")
    print(f"-----------------------------------------\n")

    return {
        "accuracy_pct": accuracy_pct,
        "mean_err_128": mean_err_128,
        "median_err_128": median_err_128,
        "mean_err_640": mean_err_640,
        "median_err_640": median_err_640,
        "mean_pos_conf": mean_pos_conf,
        "mean_neg_conf": mean_neg_conf,
        "mean_lat_ms": mean_lat,
        "p95_lat_ms": p95_lat,
    }


if __name__ == "__main__":
    validate_trained_beacon_cnn()
