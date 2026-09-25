"""Video upload and offline benchmarking API routes using OpenCV."""

import math
import os
import shutil
import threading
import time
import uuid
from typing import Dict, Optional
import cv2
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from backend.models.schemas import (
    VideoResults,
    VideoStatus,
    VideoUploadResponse,
)
from backend.tracking.tracker import OpticalTracker

router = APIRouter(prefix="/video", tags=["video"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory video benchmark job store
latest_video_job: Dict[str, VideoStatus] = {
    "current": VideoStatus(
        video_id=None,
        video_name=None,
        status="IDLE",
        fps=0.0,
        frames_processed=0,
        total_frames=0,
        progress=0.0,
        message="No video processing job submitted yet",
        results=None,
    )
}
_job_lock = threading.Lock()


def process_video_background(video_id: str, file_path: str, filename: str) -> None:
    """Run real OpenCV detection and tracking benchmark on uploaded video file."""
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        with _job_lock:
            latest_video_job["current"] = VideoStatus(
                video_id=video_id,
                video_name=filename,
                status="FAILED",
                message="Failed to open uploaded video with OpenCV",
            )
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

    dt = 1.0 / max(video_fps, 1.0)
    tracker = OpticalTracker(
        camera_center=(width / 2.0, height / 2.0),
        coarse_alignment_threshold_px=24.0,
    )

    processed_count = 0
    detected_count = 0
    aligned_count = 0
    sum_err = 0.0
    sum_sq_err = 0.0
    max_err = 0.0

    start_perf = time.perf_counter()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            processed_count += 1
            t_sim = processed_count * dt

            # Process frame through optical tracker
            res = tracker.process_frame(frame, dt, current_time=t_sim)

            if res.target_detected:
                detected_count += 1
                err = res.error_magnitude
                sum_err += err
                sum_sq_err += err * err
                if err > max_err:
                    max_err = err
                if err <= tracker.alignment_thresh:
                    aligned_count += 1

            # Update progress periodically
            if processed_count % 10 == 0 or processed_count == total_frames:
                prog = round((processed_count / max(total_frames, 1)) * 100.0, 1)
                curr_fps = round(
                    processed_count / max(time.perf_counter() - start_perf, 1e-4), 1
                )
                with _job_lock:
                    latest_video_job["current"] = VideoStatus(
                        video_id=video_id,
                        video_name=filename,
                        status="PROCESSING",
                        fps=curr_fps,
                        frames_processed=processed_count,
                        total_frames=total_frames,
                        progress=prog,
                        message=f"Processing frame {processed_count}/{total_frames}...",
                    )

        cap.release()

        # Compute final benchmark results
        elapsed_sec = max(time.perf_counter() - start_perf, 1e-4)
        calc_fps = round(processed_count / elapsed_sec, 1)

        det_rate = round((detected_count / max(processed_count, 1)) * 100.0, 1)
        succ_rate = round((aligned_count / max(processed_count, 1)) * 100.0, 1)
        loss_pct = round(100.0 - det_rate, 1)

        avg_err = round(sum_err / max(detected_count, 1), 2)
        rms_err = round(math.sqrt(sum_sq_err / max(detected_count, 1)), 2)

        results = VideoResults(
            detection_rate=det_rate,
            tracking_success_percentage=succ_rate,
            average_error=avg_err,
            maximum_error=round(max_err, 2),
            rms_error=rms_err,
            target_loss_percentage=loss_pct,
            acquisition_time=tracker.acquisition_time or 0.0,
            reacquisition_time=tracker.reacquisition_time or 0.0,
        )

        with _job_lock:
            latest_video_job["current"] = VideoStatus(
                video_id=video_id,
                video_name=filename,
                status="COMPLETED",
                fps=calc_fps,
                frames_processed=processed_count,
                total_frames=total_frames,
                progress=100.0,
                message="Video processing and optical tracking benchmark completed",
                results=results,
            )

    except Exception as e:
        if cap.isOpened():
            cap.release()
        with _job_lock:
            latest_video_job["current"] = VideoStatus(
                video_id=video_id,
                video_name=filename,
                status="FAILED",
                message=f"Video processing failed: {str(e)}",
            )


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """Upload MP4 video for FSOC terminal tracking benchmark analysis."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename must be provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".avi", ".mov"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Accepted formats: .mp4, .avi, .mov",
        )

    video_id = f"vid_{uuid.uuid4().hex[:8]}"
    saved_path = os.path.join(UPLOAD_DIR, f"{video_id}_{file.filename}")

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save video: {str(e)}"
        )

    with _job_lock:
        latest_video_job["current"] = VideoStatus(
            video_id=video_id,
            video_name=file.filename,
            status="QUEUED",
            progress=0.0,
            message="Video queued for tracking analysis",
        )

    # Spawn background worker thread
    threading.Thread(
        target=process_video_background,
        args=(video_id, saved_path, file.filename),
        daemon=True,
    ).start()

    return VideoUploadResponse(
        success=True,
        video_id=video_id,
        video_name=file.filename,
        message="Video uploaded successfully, benchmark in progress",
    )


@router.get("/status", response_model=VideoStatus)
async def get_video_status():
    """Poll status and benchmark metrics of the uploaded video."""
    with _job_lock:
        return latest_video_job["current"]

