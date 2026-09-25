"""WebSocket streaming endpoint for live tracking telemetry and camera frames."""

import asyncio
import json
import logging
import threading
import time
from typing import Optional, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.models.schemas import TrackingUpdate
from backend.simulation.engine import global_engine
from backend.simulation.state import simulation_state

router = APIRouter(tags=["websocket"])
logger = logging.getLogger("websocket")

# Active WebSocket connections
connected_clients: Set[WebSocket] = set()
_clients_lock = threading.Lock()
_event_loop: Optional[asyncio.AbstractEventLoop] = None


def set_main_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Store reference to the running FastAPI asyncio event loop."""
    global _event_loop
    _event_loop = loop


async def _async_broadcast(message_str: str) -> None:
    """Send text frame to all connected WebSocket clients."""
    with _clients_lock:
        clients = list(connected_clients)

    if not clients:
        return

    dead_clients = set()
    for ws in clients:
        try:
            await ws.send_text(message_str)
        except Exception:
            dead_clients.add(ws)

    if dead_clients:
        with _clients_lock:
            connected_clients.difference_update(dead_clients)


def broadcast_telemetry(payload: dict) -> None:
    """Thread-safe dispatch from simulation engine thread to FastAPI event loop."""
    with _clients_lock:
        has_clients = bool(connected_clients)

    if not has_clients or _event_loop is None or not _event_loop.is_running():
        return

    try:
        msg_str = json.dumps(payload)
        asyncio.run_coroutine_threadsafe(_async_broadcast(msg_str), _event_loop)
    except Exception:
        pass


# Register engine broadcast hook
global_engine.set_broadcast_callback(broadcast_telemetry)


@router.websocket("/ws/tracking")
async def websocket_tracking(websocket: WebSocket):
    """Real-time telemetry and camera frame streaming connection."""
    global _event_loop
    if _event_loop is None or not _event_loop.is_running():
        _event_loop = asyncio.get_running_loop()

    await websocket.accept()
    with _clients_lock:
        connected_clients.add(websocket)

    try:
        # Send initial connection handshake matching TrackingUpdate schema
        handshake_payload = {
            "frame_id": simulation_state.frame_id,
            "timestamp": time.time(),
            "status": simulation_state.status.value,
            "target_detected": False,
            "message": "Connected to FSOC Tracking WebSocket stream",
        }
        await websocket.send_text(json.dumps(handshake_payload))

        # Keep connection open and listen for incoming messages (e.g. ping/pong)
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.5)
                if data == "ping":
                    await websocket.send_text(
                        json.dumps({"type": "pong", "timestamp": time.time()})
                    )
            except asyncio.TimeoutError:
                # If simulation is idle/paused, send heartbeat
                if not simulation_state.running or simulation_state.paused:
                    heartbeat = {
                        "frame_id": simulation_state.frame_id,
                        "timestamp": time.time(),
                        "status": simulation_state.status.value,
                        "target_detected": False,
                        "message": simulation_state.message,
                    }
                    await websocket.send_text(json.dumps(heartbeat))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug("WebSocket exception: %s", e)
    finally:
        with _clients_lock:
            connected_clients.discard(websocket)

