import asyncio
from contextlib import asynccontextmanager
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.simulation_routes import router as simulation_router
from backend.api.video_routes import router as video_router
from backend.api.metrics_routes import router as metrics_router
from backend.api.websocket import router as websocket_router, set_main_event_loop
from backend.simulation.engine import global_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pass running event loop to websocket module
    set_main_event_loop(asyncio.get_running_loop())
    # Start engine loop
    global_engine.start()
    yield
    # Stop engine loop
    global_engine.stop()


app = FastAPI(
    title="FSOC Virtual Camera Tracking System",
    description=(
        "Backend API and WebSocket streaming engine for coarse alignment "
        "of mobile Free-Space Optical Communication (FSOC) terminals."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration to allow local React frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API endpoints under /api
app.include_router(simulation_router, prefix="/api")
app.include_router(video_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")

# Mount WebSocket endpoint
app.include_router(websocket_router)


@app.get("/")
async def root():
    return {
        "service": "FSOC Virtual Camera Tracking System",
        "status": "online",
        "docs": "/docs",
        "api_base": "/api",
        "websocket": "/ws/tracking",
    }


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
