"""Report generation and export matching frontend Report schema."""

import json
import time
from typing import Any, Dict, Optional
from backend.database.database import get_latest_experiment, save_experiment
from backend.evaluation.logger import global_logger
from backend.evaluation.metrics import global_metrics
from backend.models.schemas import SimulationConfig


def generate_experiment_report(
    config: Optional[SimulationConfig] = None,
    experiment_id: Optional[str] = None,
    notes: str = "FSOC Coarse Alignment Benchmark Test",
) -> Dict[str, Any]:
    """Generate comprehensive analytics report for the current or completed tracking run."""
    metrics_snap = global_metrics.get_snapshot()

    # If current run has 0 frames but DB has a completed experiment, return latest from DB
    if metrics_snap.get("frames_processed", 0) == 0:
        latest_saved = get_latest_experiment()
        if latest_saved and latest_saved.get("report"):
            return latest_saved["report"]

    exp_id = experiment_id or global_logger.experiment_id
    cfg = config or SimulationConfig()

    start_time = global_logger.start_time
    end_time = global_logger.end_time or time.time()
    duration = round(max(0.0, end_time - start_time), 2)

    results: Dict[str, Any] = {
        "duration": duration,
        **metrics_snap,
    }

    report: Dict[str, Any] = {
        "experiment_id": exp_id,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_time)),
        "simulation_config": cfg.model_dump(),
        "target_config": cfg.target.model_dump(),
        "disturbances": cfg.disturbances.model_dump(),
        "pid": cfg.pid.model_dump(),
        "tracking_algorithm": f"AI BeaconCNN ({getattr(cfg.target, 'detector_mode', 'HYBRID')}) + 4D Kalman Filter + GNN Association + Dual PID Slew Control",
        "results": results,
        "notes": notes,
    }

    # Save summary to SQLite experiments table
    try:
        save_experiment(
            experiment_id=exp_id,
            start_time=start_time,
            end_time=end_time,
            config_dict=cfg.model_dump(),
            metrics_dict=metrics_snap,
            report_dict=report,
            tracking_algorithm=report["tracking_algorithm"],
            notes=notes,
        )
    except Exception:
        pass

    return report

