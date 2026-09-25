"""Simulation and health REST endpoints."""

from fastapi import APIRouter, HTTPException, status
from backend.models.schemas import (
    HealthResponse,
    SimulationActionResponse,
    SimulationConfig,
    SimulationStatusResponse,
)
from backend.simulation.state import simulation_state

router = APIRouter(tags=["simulation"])


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """System health check endpoint polled by frontend TopBar."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        uptime=simulation_state.get_uptime(),
        message="FSOC Virtual Camera Tracking System backend healthy",
    )


@router.get("/simulation/status", response_model=SimulationStatusResponse)
async def get_simulation_status() -> SimulationStatusResponse:
    """Returns the current simulation lifecycle status and active parameters."""
    return simulation_state.get_status_response()


@router.post("/simulation/configure", response_model=SimulationActionResponse)
async def configure_simulation(config: SimulationConfig) -> SimulationActionResponse:
    """Updates the active simulation and disturbance configuration."""
    ok, message = simulation_state.configure(config)
    return SimulationActionResponse(
        success=ok,
        status=simulation_state.status,
        message=message,
    )


@router.post("/simulation/start", response_model=SimulationActionResponse)
async def start_simulation() -> SimulationActionResponse:
    """Starts coarse alignment optical tracking simulation."""
    ok, message = simulation_state.start()
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )
    return SimulationActionResponse(
        success=True,
        status=simulation_state.status,
        message=message,
    )


@router.post("/simulation/pause", response_model=SimulationActionResponse)
async def pause_simulation() -> SimulationActionResponse:
    """Pauses the active simulation."""
    ok, message = simulation_state.pause()
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )
    return SimulationActionResponse(
        success=True,
        status=simulation_state.status,
        message=message,
    )


@router.post("/simulation/resume", response_model=SimulationActionResponse)
async def resume_simulation() -> SimulationActionResponse:
    """Resumes a paused simulation."""
    ok, message = simulation_state.resume()
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )
    return SimulationActionResponse(
        success=True,
        status=simulation_state.status,
        message=message,
    )


@router.post("/simulation/stop", response_model=SimulationActionResponse)
async def stop_simulation() -> SimulationActionResponse:
    """Stops the active simulation."""
    ok, message = simulation_state.stop()
    return SimulationActionResponse(
        success=True,
        status=simulation_state.status,
        message=message,
    )


@router.post("/simulation/reset", response_model=SimulationActionResponse)
async def reset_simulation() -> SimulationActionResponse:
    """Resets the simulation lifecycle state and frame counters back to IDLE."""
    ok, message = simulation_state.reset()
    return SimulationActionResponse(
        success=True,
        status=simulation_state.status,
        message=message,
    )


@router.get("/simulation/scenarios")
async def get_scenarios():
    """Retrieve list of predefined hackathon demo scenarios."""
    from backend.simulation.scenarios import get_predefined_scenarios
    scenarios = get_predefined_scenarios()
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "description": s["description"],
            "config": s["config"].model_dump(),
        }
        for s in scenarios.values()
    ]


@router.post("/simulation/scenario/{scenario_id}", response_model=SimulationActionResponse)
async def apply_scenario(scenario_id: str) -> SimulationActionResponse:
    """Apply a predefined demonstration scenario configuration."""
    from backend.simulation.scenarios import get_predefined_scenarios
    scenarios = get_predefined_scenarios()
    if scenario_id not in scenarios:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found. Available: {list(scenarios.keys())}",
        )

    scen = scenarios[scenario_id]
    ok, message = simulation_state.configure(scen["config"])
    return SimulationActionResponse(
        success=ok,
        status=simulation_state.status,
        message=f"Applied {scen['name']}: {message}",
    )

