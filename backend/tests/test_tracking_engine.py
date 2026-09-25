"""Unit and integration tests for FSOC Core Tracking Engine."""

import math
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.control.pid import DualAxisPIDController, PIDController
from backend.disturbances import DisturbanceEngine
from backend.disturbances.noise import apply_gaussian_noise, apply_salt_pepper_noise
from backend.evaluation.metrics import PerformanceMetricsCalculator
from backend.evaluation.report import generate_experiment_report
from backend.models.schemas import CameraConfig, DisturbanceConfig, SimulationConfig, TargetConfig, TrajectoryEnum
from backend.simulation.target import TargetManager
from backend.simulation.trajectories import (
    CircularTrajectory,
    Figure8Trajectory,
    RandomTrajectory,
    StraightTrajectory,
    create_trajectory,
)
from backend.simulation.virtual_camera import VirtualCamera
from backend.tracking.association import associate_candidate
from backend.tracking.kalman import KalmanFilter4D
from backend.tracking.tracker import OpticalTracker
from backend.vision.detector import BeaconCandidate, OpticalBeaconDetector
from backend.vision.preprocessing import encode_frame_to_base64, render_optical_scene


def test_trajectory_generators():
    """Verify all trajectory types generate continuous, bounded coordinates."""
    trajs = [
        StraightTrajectory(1000.0, 1000.0, speed=40.0),
        CircularTrajectory(1000.0, 1000.0, speed=40.0, radius=300.0),
        Figure8Trajectory(1000.0, 1000.0, speed=40.0, scale=300.0),
        RandomTrajectory(1000.0, 1000.0, speed=40.0, scale=300.0),
    ]

    for traj in trajs:
        for t in [0.0, 0.5, 1.0, 2.5, 5.0]:
            x, y = traj.get_position(t)
            assert not math.isnan(x) and not math.isnan(y)
            assert not math.isinf(x) and not math.isinf(y)
            assert 0.0 <= x <= 2000.0
            assert 0.0 <= y <= 2000.0


def test_target_manager():
    """Verify multi-target management and designated target selection."""
    cfg = TargetConfig(count=3, designated_id=2, trajectory=TrajectoryEnum.circular)
    mgr = TargetManager(cfg)

    assert len(mgr.targets) == 3
    desig = mgr.get_designated_target()
    assert desig is not None
    assert desig.target_id == 2
    assert desig.designated is True

    # Update trajectories at t=1.0
    targets = mgr.update(1.0)
    assert len(targets) == 3
    assert targets[0].world_x != 0.0


def test_virtual_camera_projection():
    """Verify optical projection from world canvas to sensor pixel plane."""
    cam_cfg = CameraConfig(width=640, height=480, horizontal_fov=60.0, vertical_fov=45.0)
    cam = VirtualCamera(cam_cfg)

    # World origin (1000, 1000) corresponds to optical axis (pan=0, tilt=0)
    u, v, in_fov = cam.world_to_camera(1000.0, 1000.0)
    assert u == pytest.approx(320.0, abs=1.0)
    assert v == pytest.approx(240.0, abs=1.0)
    assert in_fov is True

    # Check angular error computation
    err_pan, err_tilt, err_mag = cam.camera_to_angular_error(320.0, 240.0)
    assert err_mag == pytest.approx(0.0, abs=1e-3)

    # Offset target to right
    err_pan, err_tilt, _ = cam.camera_to_angular_error(420.0, 240.0)
    assert err_pan > 0.0  # Must pan right


def test_camera_gimbal_slew_clamping():
    """Verify slew rate limits on camera gimbal motion."""
    cam = VirtualCamera(CameraConfig(max_pan_speed=30.0, max_tilt_speed=30.0))
    # Command 100 deg/s slew rate (exceeds 30 deg/s limit)
    cam.step_control(100.0, -100.0, dt=1.0)

    assert cam.pan == pytest.approx(30.0, abs=0.1)
    assert cam.tilt == pytest.approx(-30.0, abs=0.1)


def test_disturbances():
    """Verify sensor noise and disturbance transformations."""
    frame = np.full((480, 640, 3), 100, dtype=np.uint8)

    # Gaussian noise
    noisy = apply_gaussian_noise(frame, intensity=0.5)
    assert noisy.shape == frame.shape
    assert noisy.dtype == np.uint8
    assert not np.array_equal(noisy, frame)

    # S&P noise
    sp_noisy = apply_salt_pepper_noise(frame, intensity=0.5)
    assert sp_noisy.shape == frame.shape

    # Disturbance engine
    cfg = DisturbanceConfig()
    cfg.haze_fog.enabled = True
    cfg.haze_fog.intensity = 0.5
    engine = DisturbanceEngine()
    foggy = engine.apply_to_frame(frame, cfg, t=0.5)
    assert foggy.shape == frame.shape


def test_vision_pipeline_detection():
    """Verify rendering optical beacon and sub-pixel detection with OpenCV."""
    mgr = TargetManager(TargetConfig(beacon_size=16.0))
    cam = VirtualCamera()

    # Position target at camera center
    targets = mgr.update(0.0)
    targets[0].cam_x = 320.0
    targets[0].cam_y = 240.0
    targets[0].is_in_fov = True

    # Render optical scene
    frame = render_optical_scene(cam.width, cam.height, targets)
    assert frame.shape == (480, 640, 3)

    # Run OpenCV detector
    detector = OpticalBeaconDetector()
    candidates = detector.detect(frame)

    assert len(candidates) >= 1
    best = candidates[0]
    assert best.x == pytest.approx(320.0, abs=2.0)
    assert best.y == pytest.approx(240.0, abs=2.0)
    assert best.confidence >= 0.70

    # Test base64 encoding
    b64 = encode_frame_to_base64(frame)
    assert b64.startswith("data:image/jpeg;base64,")


def test_kalman_filter():
    """Verify 4D Kalman filter state prediction and update."""
    kf = KalmanFilter4D()
    kf.initialize(x=100.0, y=200.0, vx=10.0, vy=5.0)

    # Predict forward by 0.1s
    px, py = kf.predict(0.1)
    assert px == pytest.approx(101.0, abs=0.2)
    assert py == pytest.approx(200.5, abs=0.2)

    # Update with measurement
    ux, uy = kf.update(101.2, 200.4)
    assert abs(ux - 101.2) < 0.5
    assert abs(uy - 200.4) < 0.5


def test_gnn_association():
    """Verify Gated Nearest Neighbor candidate association."""
    pred_pos = (300.0, 200.0)
    candidates = [
        BeaconCandidate(x=500.0, y=500.0, bbox_x=495, bbox_y=495, bbox_w=10, bbox_h=10, area=50, peak_intensity=200, circularity=0.9, confidence=0.9),
        BeaconCandidate(x=305.0, y=198.0, bbox_x=300, bbox_y=193, bbox_w=10, bbox_h=10, area=50, peak_intensity=220, circularity=0.95, confidence=0.95),
    ]

    matched = associate_candidate(candidates, pred_pos, uncertainty=10.0, gate_radius_px=50.0)
    assert matched is not None
    assert matched.x == 305.0
    assert matched.y == 198.0


def test_pid_controller():
    """Verify PID controller output, anti-windup clamping, and filtering."""
    pid = PIDController(kp=1.0, ki=0.1, kd=0.05, output_limit=50.0, integral_limit=10.0)

    # Constant error step
    out1 = pid.update(error=10.0, dt=0.1)
    assert out1 > 0.0

    # Saturated large error
    out_sat = pid.update(error=1000.0, dt=0.1)
    assert out_sat <= 50.0

    # Dual axis controller
    dual = DualAxisPIDController()
    pan_rate, tilt_rate = dual.compute_rate_commands(error_pan_deg=5.0, error_tilt_deg=-3.0, dt=0.033)
    assert pan_rate > 0.0
    assert tilt_rate < 0.0


def test_performance_metrics_calculator():
    """Verify calculation of RMSE, maximum error, and target loss percentages."""
    calc = PerformanceMetricsCalculator(coarse_threshold_px=20.0)

    # Feed 10 frames: 8 detected (errors 10px each), 2 lost
    for _ in range(8):
        calc.record_frame(error_mag=10.0, detected=True, confidence=0.9)
    for _ in range(2):
        calc.record_frame(error_mag=0.0, detected=False, confidence=0.0)

    snap = calc.get_snapshot()
    assert snap["frames_processed"] == 10
    assert snap["average_error"] == 10.0
    assert snap["rms_error"] == 10.0
    assert snap["target_loss_percentage"] == 20.0
    assert snap["tracking_success_percentage"] == 80.0


def test_metrics_and_report_endpoints(client: TestClient):
    """Test GET /api/metrics and GET /api/report."""
    m_res = client.get("/api/metrics")
    assert m_res.status_code == 200
    m_data = m_res.json()
    assert "rms_error" in m_data
    assert "tracking_success_percentage" in m_data

    r_res = client.get("/api/report")
    assert r_res.status_code == 200
    r_data = r_res.json()
    assert "experiment_id" in r_data
    assert "results" in r_data
    assert "tracking_algorithm" in r_data


def test_video_status_initial(client: TestClient):
    """Test GET /api/video/status."""
    v_res = client.get("/api/video/status")
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["status"] in ("IDLE", "COMPLETED", "PROCESSING")


def test_live_simulation_websocket_stream(client: TestClient):
    """Test end-to-end live optical tracking stream over WebSocket."""
    import json
    import time

    # Connect to live websocket
    with client.websocket_connect("/ws/tracking") as ws:
        # Initial handshake frame
        init_frame = json.loads(ws.receive_text())
        assert "Connected to FSOC Tracking" in init_frame.get("message", "")

        # Start the tracking simulation
        start_res = client.post("/api/simulation/start")
        assert start_res.status_code == 200

        # Receive streamed tracking frames
        frames_received = []
        for _ in range(12):
            msg = ws.receive_text()
            data = json.loads(msg)
            if data.get("frame_id", 0) > 0:
                frames_received.append(data)

        # Stop simulation
        stop_res = client.post("/api/simulation/stop")
        assert stop_res.status_code == 200

        # Verify stream frames structure
        assert len(frames_received) >= 5
        sample = frames_received[-1]
        assert "frame_id" in sample
        assert sample["frame_id"] > 0
        assert "frame" in sample
        assert sample["frame"].startswith("data:image/jpeg;base64,")
        assert "performance" in sample
        assert "fps" in sample["performance"]
        assert "camera" in sample
        assert "pan" in sample["camera"]
        assert "tilt" in sample["camera"]


def test_simulation_scenarios_api(client: TestClient):
    """Test retrieving and applying predefined demo scenarios."""
    scens_res = client.get("/api/simulation/scenarios")
    assert scens_res.status_code == 200
    scens_list = scens_res.json()
    assert len(scens_list) == 7
    ids = [s["id"] for s in scens_list]
    assert "scenario_1" in ids
    assert "scenario_2" in ids
    assert "scenario_7" in ids

    # Apply scenario 2 (fast target)
    apply_res = client.post("/api/simulation/scenario/scenario_2")
    assert apply_res.status_code == 200
    assert apply_res.json()["success"] is True

    # Verify status reflects new config
    status_res = client.get("/api/simulation/status")
    status_data = status_res.json()
    assert status_data["config"]["target"]["speed"] == 130.0
    assert status_data["config"]["target"]["trajectory"] == "figure8"

    # Test invalid scenario
    bad_res = client.post("/api/simulation/scenario/nonexistent_scenario")
    assert bad_res.status_code == 404


def test_video_invalid_extension(client: TestClient):
    """Test uploading invalid video file format returns HTTP 400."""
    fake_file = ("test.txt", b"not a video", "text/plain")
    res = client.post("/api/video/upload", files={"file": fake_file})
    assert res.status_code == 400


def test_video_upload_and_processing(client: TestClient, tmp_path):
    """Generate synthetic video, upload, and verify end-to-end benchmarking results."""
    import cv2
    import io
    import time

    # Create a 15-frame test avi video with moving beacon
    vid_file = tmp_path / "test_beacon.avi"
    fourcc = cv2.VideoWriter_fourcc(*"MJPG")
    out = cv2.VideoWriter(str(vid_file), fourcc, 15.0, (640, 480))

    for i in range(15):
        frame = np.full((480, 640, 3), 20, dtype=np.uint8)
        # Moving bright beacon spot
        bx = int(320 + 20 * math.cos(i * 0.4))
        by = int(240 + 20 * math.sin(i * 0.4))
        cv2.circle(frame, (bx, by), 8, (255, 255, 255), -1)
        out.write(frame)
    out.release()

    with open(str(vid_file), "rb") as f:
        upload_res = client.post(
            "/api/video/upload",
            files={"file": ("test_beacon.avi", f, "video/x-msvideo")},
        )
    assert upload_res.status_code == 200
    up_data = upload_res.json()
    assert up_data["success"] is True
    assert up_data["video_name"] == "test_beacon.avi"

    # Poll status for up to 3 seconds until completed
    for _ in range(30):
        stat_res = client.get("/api/video/status")
        stat_data = stat_res.json()
        if stat_data["status"] == "COMPLETED":
            break
        time.sleep(0.1)

    assert stat_data["status"] == "COMPLETED"
    assert stat_data["progress"] == 100.0
    assert stat_data["frames_processed"] >= 15
    res = stat_data["results"]
    assert res is not None
    assert res["detection_rate"] >= 80.0
    assert res["tracking_success_percentage"] >= 80.0
    assert res["average_error"] >= 0.0
    assert res["rms_error"] >= 0.0
    assert res["maximum_error"] >= 0.0


