"""Performance metrics and experiment report endpoints."""

from typing import Any, Dict
from fastapi import APIRouter
from backend.database.database import get_latest_experiment
from backend.evaluation.logger import global_logger
from backend.evaluation.metrics import global_metrics
from backend.evaluation.report import generate_experiment_report
from backend.models.schemas import PerformanceMetrics, Report
from backend.simulation.state import simulation_state

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_model=PerformanceMetrics)
async def get_current_metrics() -> Dict[str, Any]:
    """Retrieve real-time tracking performance analytics and benchmarking figures."""
    snap = global_metrics.get_snapshot()

    # If current run is idle with 0 frames, load latest saved experiment from DB
    if snap.get("frames_processed", 0) == 0:
        latest = get_latest_experiment()
        if latest and latest.get("final_metrics"):
            snap.update(latest["final_metrics"])

    # Include time-series telemetry for Analytics charts
    snap["time_series"] = global_logger.get_recent_samples(limit=300)
    return snap


@router.get("/report", response_model=Report)
async def get_experiment_report() -> Dict[str, Any]:
    """Compile and export comprehensive performance report with current configuration."""
    return generate_experiment_report(simulation_state.config)

