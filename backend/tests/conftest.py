"""Pytest fixtures for backend tests."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.simulation.state import simulation_state


@pytest.fixture(autouse=True)
def reset_state():
    """Ensure simulation state is clean and IDLE before each test."""
    simulation_state.reset()
    yield
    simulation_state.reset()


@pytest.fixture
def client():
    """FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client
