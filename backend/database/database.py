"""Database configuration and session management for FSOC tracking experiments."""

import json
import os
import sqlite3
import time
from typing import Any, Dict, List, Optional

DATABASE_PATH = os.getenv("DATABASE_PATH", "fsoc_tracking.db")


def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create experiment-level storage table if not present and ensure all columns exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS experiments (
            experiment_id TEXT PRIMARY KEY,
            start_time REAL,
            end_time REAL,
            duration REAL,
            tracking_algorithm TEXT,
            average_error REAL,
            rms_error REAL,
            maximum_error REAL,
            tracking_success_percentage REAL,
            target_loss_percentage REAL,
            acquisition_time REAL,
            reacquisition_time REAL,
            fps REAL,
            detection_rate REAL,
            frames_processed INTEGER,
            config_json TEXT,
            final_metrics_json TEXT,
            report_json TEXT,
            notes TEXT,
            created_at REAL
        )
        """
    )
    cursor.execute("PRAGMA table_info(experiments)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    needed_cols = {
        "experiment_id": "TEXT",
        "start_time": "REAL",
        "end_time": "REAL",
        "duration": "REAL",
        "tracking_algorithm": "TEXT",
        "average_error": "REAL",
        "rms_error": "REAL",
        "maximum_error": "REAL",
        "tracking_success_percentage": "REAL",
        "target_loss_percentage": "REAL",
        "acquisition_time": "REAL",
        "reacquisition_time": "REAL",
        "fps": "REAL",
        "detection_rate": "REAL",
        "frames_processed": "INTEGER",
        "config_json": "TEXT",
        "final_metrics_json": "TEXT",
        "report_json": "TEXT",
        "notes": "TEXT",
        "created_at": "REAL",
    }
    for col_name, col_type in needed_cols.items():
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE experiments ADD COLUMN {col_name} {col_type}")
    conn.commit()
    conn.close()


def save_experiment(
    experiment_id: str,
    start_time: float,
    end_time: float,
    config_dict: Dict[str, Any],
    metrics_dict: Dict[str, Any],
    report_dict: Dict[str, Any],
    tracking_algorithm: str = "4D Kalman Filter + GNN Association + Dual PID Slew Control",
    notes: str = "FSOC Coarse Alignment Benchmark Test",
) -> None:
    """Store complete experiment configuration and summary metrics to SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    duration = round(max(0.0, end_time - start_time), 2)

    cursor.execute(
        """
        INSERT OR REPLACE INTO experiments (
            experiment_id, start_time, end_time, duration, tracking_algorithm,
            average_error, rms_error, maximum_error, tracking_success_percentage,
            target_loss_percentage, acquisition_time, reacquisition_time,
            fps, detection_rate, frames_processed, config_json,
            final_metrics_json, report_json, notes, created_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
        )
        """,
        (
            experiment_id,
            start_time,
            end_time,
            duration,
            tracking_algorithm,
            metrics_dict.get("average_error", 0.0),
            metrics_dict.get("rms_error", 0.0),
            metrics_dict.get("maximum_error", 0.0),
            metrics_dict.get("tracking_success_percentage", 0.0),
            metrics_dict.get("target_loss_percentage", 0.0),
            metrics_dict.get("acquisition_time", 0.0),
            metrics_dict.get("reacquisition_time", 0.0),
            metrics_dict.get("fps", 0.0),
            metrics_dict.get("detection_confidence", 0.0) * 100.0,
            metrics_dict.get("frames_processed", 0),
            json.dumps(config_dict),
            json.dumps(metrics_dict),
            json.dumps(report_dict),
            notes,
            time.time(),
        ),
    )
    conn.commit()
    conn.close()


def get_latest_experiment() -> Optional[Dict[str, Any]]:
    """Retrieve the most recent experiment run from SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT * FROM experiments
        ORDER BY created_at DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "experiment_id": row["experiment_id"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
        "duration": row["duration"],
        "tracking_algorithm": row["tracking_algorithm"],
        "average_error": row["average_error"],
        "rms_error": row["rms_error"],
        "maximum_error": row["maximum_error"],
        "tracking_success_percentage": row["tracking_success_percentage"],
        "target_loss_percentage": row["target_loss_percentage"],
        "acquisition_time": row["acquisition_time"],
        "reacquisition_time": row["reacquisition_time"],
        "fps": row["fps"],
        "detection_rate": row["detection_rate"],
        "frames_processed": row["frames_processed"],
        "config": json.loads(row["config_json"]) if row["config_json"] else {},
        "final_metrics": json.loads(row["final_metrics_json"]) if row["final_metrics_json"] else {},
        "report": json.loads(row["report_json"]) if row["report_json"] else {},
        "notes": row["notes"],
        "created_at": row["created_at"],
    }


init_db()


