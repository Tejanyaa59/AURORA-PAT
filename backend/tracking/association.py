"""Data association algorithms for multi-candidate beacon tracking."""

import math
from typing import List, Optional, Tuple
from backend.vision.detector import BeaconCandidate


def associate_candidate(
    candidates: List[BeaconCandidate],
    predicted_pos: Tuple[float, float],
    uncertainty: float = 10.0,
    gate_radius_px: float = 85.0,
) -> Optional[BeaconCandidate]:
    """Find best matching candidate detection within the validation gate using GNN."""
    if not candidates:
        return None

    px, py = predicted_pos
    # Dynamic gate radius based on Kalman filter uncertainty
    effective_gate = max(gate_radius_px, 3.0 * uncertainty)

    best_candidate: Optional[BeaconCandidate] = None
    min_cost = float("inf")

    for cand in candidates:
        dist = math.hypot(cand.x - px, cand.y - py)
        # In single target tracking, allow up to 130 px window if confidence is high
        cand_gate = effective_gate if len(candidates) > 1 else max(effective_gate, 130.0)
        if dist > cand_gate:
            continue

        # Normalized cost combines spatial deviation and detection confidence
        cost = (dist / cand_gate) - 0.4 * cand.confidence
        if cost < min_cost:
            min_cost = cost
            best_candidate = cand

    return best_candidate
