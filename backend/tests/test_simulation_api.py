"""Tests for health, simulation lifecycle, and WebSocket endpoints."""

import json
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Test GET /api/health."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "uptime" in data
    assert data["uptime"] >= 0


def test_initial_simulation_status(client: TestClient):
    """Test GET /api/simulation/status initially returns IDLE."""
    response = client.get("/api/simulation/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "IDLE"
    assert data["running"] is False
    assert data["paused"] is False
    assert data["frame_id"] == 0
    assert "config" in data


def test_configure_simulation(client: TestClient):
    """Test POST /api/simulation/configure updates configuration parameters."""
    new_config = {
        "screen": {"width": 1920, "height": 1080},
        "camera": {
            "width": 1280,
            "height": 720,
            "horizontal_fov": 75.0,
            "vertical_fov": 50.0,
            "max_pan_speed": 120.0,
            "max_tilt_speed": 100.0,
            "jitter_x": 0.5,
            "jitter_y": 0.5,
        },
        "target": {
            "beacon_size": 20.0,
            "speed": 60.0,
            "trajectory": "figure8",
            "count": 2,
            "designated_id": 1,
        },
        "disturbances": {
            "gaussian_noise": {"enabled": True, "intensity": 0.4},
            "salt_pepper_noise": {"enabled": False, "intensity": 0.3},
            "motion_blur": {"enabled": True, "intensity": 0.6},
            "brightness_variation": {"enabled": False, "intensity": 0.3},
            "contrast_variation": {"enabled": False, "intensity": 0.3},
            "low_light": {"enabled": False, "intensity": 0.3},
            "haze_fog": {"enabled": False, "intensity": 0.3},
            "rain": {"enabled": False, "intensity": 0.3},
            "camera_jitter": {"enabled": True, "intensity": 0.2},
            "platform_motion": {"enabled": False, "intensity": 0.3},
        },
        "pid": {
            "pan": {"kp": 1.2, "ki": 0.05, "kd": 0.2},
            "tilt": {"kp": 1.0, "ki": 0.04, "kd": 0.15},
        },
    }
    response = client.post("/api/simulation/configure", json=new_config)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True

    # Verify updated in status
    status_res = client.get("/api/simulation/status")
    status_data = status_res.json()
    assert status_data["config"]["screen"]["width"] == 1920
    assert status_data["config"]["target"]["trajectory"] == "figure8"
    assert status_data["config"]["pid"]["pan"]["kp"] == 1.2


def test_simulation_lifecycle(client: TestClient):
    """Test start -> pause -> resume -> stop -> reset lifecycle transitions."""
    # 1. Start
    res = client.post("/api/simulation/start")
    assert res.status_code == 200
    assert res.json()["success"] is True

    status_res = client.get("/api/simulation/status")
    assert status_res.json()["status"] == "SEARCHING"
    assert status_res.json()["running"] is True
    assert status_res.json()["paused"] is False

    # 2. Pause
    res = client.post("/api/simulation/pause")
    assert res.status_code == 200
    assert res.json()["status"] == "PAUSED"

    status_res = client.get("/api/simulation/status")
    assert status_res.json()["status"] == "PAUSED"
    assert status_res.json()["paused"] is True

    # 3. Resume
    res = client.post("/api/simulation/resume")
    assert res.status_code == 200
    assert res.json()["status"] == "SEARCHING"

    status_res = client.get("/api/simulation/status")
    assert status_res.json()["status"] == "SEARCHING"
    assert status_res.json()["paused"] is False

    # 4. Stop
    res = client.post("/api/simulation/stop")
    assert res.status_code == 200
    assert res.json()["status"] == "STOPPED"

    status_res = client.get("/api/simulation/status")
    assert status_res.json()["status"] == "STOPPED"
    assert status_res.json()["running"] is False

    # 5. Reset
    res = client.post("/api/simulation/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "IDLE"

    status_res = client.get("/api/simulation/status")
    assert status_res.json()["status"] == "IDLE"


def test_invalid_lifecycle_transitions(client: TestClient):
    """Test that invalid action states return HTTP 409 Conflict."""
    # Cannot pause when IDLE
    res = client.post("/api/simulation/pause")
    assert res.status_code == 409

    # Cannot resume when IDLE
    res = client.post("/api/simulation/resume")
    assert res.status_code == 409

    # Start simulation
    client.post("/api/simulation/start")

    # Cannot start when already running
    res = client.post("/api/simulation/start")
    assert res.status_code == 409


def test_websocket_tracking_handshake(client: TestClient):
    """Test connecting to /ws/tracking and receiving handshake frame."""
    with client.websocket_connect("/ws/tracking") as websocket:
        data = websocket.receive_text()
        frame = json.loads(data)
        assert frame["frame_id"] == 0
        assert frame["status"] == "IDLE"
        assert frame["target_detected"] is False
        assert "Connected to FSOC Tracking" in frame["message"]

        # Send ping and receive response
        websocket.send_text("ping")
        resp = websocket.receive_text()
        resp_data = json.loads(resp)
        # Could be pong or status
        assert "type" in resp_data or "status" in resp_data
