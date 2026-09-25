# FSOC Virtual Camera Tracking System — Backend

Python FastAPI backend for the Smart India Hackathon project:
**"AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile Free-Space Optical Communication (FSOC) Terminals"**

## Architecture

- **FastAPI**: Asynchronous high-performance REST API and WebSocket streaming.
- **Computer Vision & Tracking**: OpenCV and Kalman filtering for optical beacon detection and coarse tracking.
- **Control System**: Dual-axis Pan-Tilt PID controller simulator.
- **Disturbance Simulation**: Optical atmosphere, camera jitter, low light, and platform vibrations.

## Endpoints

### REST API (`/api/...`)
- `GET /api/health`: Health status, uptime, and API version.
- `GET /api/simulation/status`: Current simulation state, frame counter, and active configuration.
- `POST /api/simulation/configure`: Update terminal, sensor, disturbance, and PID settings.
- `POST /api/simulation/start`: Start coarse alignment simulation.
- `POST /api/simulation/pause`: Pause active simulation.
- `POST /api/simulation/resume`: Resume paused simulation.
- `POST /api/simulation/stop`: Stop active simulation.
- `POST /api/simulation/reset`: Reset state and frame counters back to IDLE.

### WebSocket
- `ws://localhost:8000/ws/tracking`: Live real-time optical frame, telemetry, and tracking stream.

## Setup & Running

```sh
pip install -r requirements.txt
python main.py
```
Server runs at `http://localhost:8000`. Interactive Swagger documentation available at `http://localhost:8000/docs`.
