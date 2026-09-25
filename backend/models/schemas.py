"""Pydantic schemas mirroring the frontend API contract."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TrajectoryEnum(str, Enum):
    straight = "straight"
    circular = "circular"
    figure8 = "figure8"
    random = "random"


class SimulationStatusEnum(str, Enum):
    IDLE = "IDLE"
    INITIALIZING = "INITIALIZING"
    SEARCHING = "SEARCHING"
    ACQUIRING = "ACQUIRING"
    TRACKING = "TRACKING"
    TARGET_LOST = "TARGET_LOST"
    RE_ACQUIRING = "RE-ACQUIRING"
    TRACKING_LOCKED = "TRACKING_LOCKED"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"


class ScreenConfig(BaseModel):
    width: int = Field(default=1280, ge=320, le=3840)
    height: int = Field(default=720, ge=240, le=2160)


class CameraConfig(BaseModel):
    width: int = Field(default=640, ge=160, le=1920)
    height: int = Field(default=480, ge=120, le=1080)
    horizontal_fov: float = Field(default=60.0, ge=5.0, le=120.0)
    vertical_fov: float = Field(default=45.0, ge=5.0, le=120.0)
    max_pan_speed: float = Field(default=90.0, ge=1.0, le=360.0)
    max_tilt_speed: float = Field(default=90.0, ge=1.0, le=360.0)
    min_pan: float = Field(default=-45.0, ge=-180.0, le=0.0)
    max_pan: float = Field(default=45.0, ge=0.0, le=180.0)
    min_tilt: float = Field(default=-45.0, ge=-90.0, le=0.0)
    max_tilt: float = Field(default=45.0, ge=0.0, le=90.0)
    jitter_x: float = Field(default=0.0, ge=0.0, le=20.0)
    jitter_y: float = Field(default=0.0, ge=0.0, le=20.0)


class TargetConfig(BaseModel):
    beacon_size: float = Field(default=12.0, ge=2.0, le=80.0)
    speed: float = Field(default=40.0, ge=0.0, le=400.0)
    trajectory: TrajectoryEnum = Field(default=TrajectoryEnum.circular)
    count: int = Field(default=1, ge=1, le=10)
    designated_id: int = Field(default=1, ge=1, le=10)
    detector_mode: str = Field(default="AI", pattern="^(AI|HYBRID|OPENCV)$")


class PIDGains(BaseModel):
    kp: float = Field(default=1.8, ge=0.0, le=10.0)
    ki: float = Field(default=0.8, ge=0.0, le=5.0)
    kd: float = Field(default=0.15, ge=0.0, le=5.0)


class PIDConfig(BaseModel):
    pan: PIDGains = Field(default_factory=PIDGains)
    tilt: PIDGains = Field(default_factory=PIDGains)


class DisturbanceSetting(BaseModel):
    enabled: bool = False
    intensity: float = Field(default=0.3, ge=0.0, le=1.0)


class DisturbanceConfig(BaseModel):
    gaussian_noise: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    salt_pepper_noise: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    motion_blur: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    brightness_variation: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    contrast_variation: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    low_light: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    haze_fog: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    rain: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    camera_jitter: DisturbanceSetting = Field(default_factory=DisturbanceSetting)
    platform_motion: DisturbanceSetting = Field(default_factory=DisturbanceSetting)


class SimulationConfig(BaseModel):
    screen: ScreenConfig = Field(default_factory=ScreenConfig)
    camera: CameraConfig = Field(default_factory=CameraConfig)
    target: TargetConfig = Field(default_factory=TargetConfig)
    disturbances: DisturbanceConfig = Field(default_factory=DisturbanceConfig)
    pid: PIDConfig = Field(default_factory=PIDConfig)


class SimulationStatusResponse(BaseModel):
    status: SimulationStatusEnum
    running: bool = False
    paused: bool = False
    frame_id: int = 0
    elapsed_time: float = 0.0
    message: Optional[str] = None
    config: Optional[SimulationConfig] = None


class SimulationActionResponse(BaseModel):
    success: bool = True
    status: Optional[SimulationStatusEnum] = None
    message: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    uptime: float = 0.0
    message: Optional[str] = "FSOC Tracking System backend running"


class TargetSchema(BaseModel):
    id: int
    x: float
    y: float
    predicted_x: Optional[float] = None
    predicted_y: Optional[float] = None
    confidence: Optional[float] = None
    detected: Optional[bool] = None
    designated: Optional[bool] = None
    uncertainty: Optional[float] = None
    velocity_x: Optional[float] = None
    velocity_y: Optional[float] = None
    kalman_state: Optional[str] = None


class CameraCenter(BaseModel):
    x: float
    y: float


class TrackingError(BaseModel):
    x: float
    y: float
    magnitude: float


class CameraState(BaseModel):
    pan: float
    tilt: float
    pan_speed: Optional[float] = None
    tilt_speed: Optional[float] = None
    commanded_pan_deg_s: Optional[float] = None
    commanded_tilt_deg_s: Optional[float] = None
    actual_pan_deg: Optional[float] = None
    actual_tilt_deg: Optional[float] = None
    min_pan_deg: Optional[float] = -45.0
    max_pan_deg: Optional[float] = 45.0
    min_tilt_deg: Optional[float] = -45.0
    max_tilt_deg: Optional[float] = 45.0


class PerformanceSnapshot(BaseModel):
    fps: Optional[float] = None
    average_error: Optional[float] = None
    maximum_error: Optional[float] = None
    rms_error: Optional[float] = None
    target_loss_percentage: Optional[float] = None
    acquisition_time: Optional[float] = None
    reacquisition_time: Optional[float] = None
    tracking_success_percentage: Optional[float] = None
    detection_confidence: Optional[float] = None
    frames_processed: Optional[int] = None
    target_loss_events: Optional[int] = None
    detector_mode: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_inference_ms: Optional[float] = None


class FrameInfo(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None


class TrackingUpdate(BaseModel):
    frame_id: int
    timestamp: float
    status: str
    target_detected: bool
    target: Optional[TargetSchema] = None
    targets: Optional[List[TargetSchema]] = None
    designated_target_id: Optional[int] = None
    camera_center: Optional[CameraCenter] = None
    error: Optional[TrackingError] = None
    camera: Optional[CameraState] = None
    performance: Optional[PerformanceSnapshot] = None
    frame: Optional[str] = None
    frame_info: Optional[FrameInfo] = None
    confidence: Optional[float] = None
    detector_mode: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_inference_ms: Optional[float] = None
    error_x_px: Optional[float] = None
    error_y_px: Optional[float] = None
    commanded_pan_deg_s: Optional[float] = None
    commanded_tilt_deg_s: Optional[float] = None
    actual_pan_deg: Optional[float] = None
    actual_tilt_deg: Optional[float] = None
    velocity_x: Optional[float] = None
    velocity_y: Optional[float] = None
    kalman_state: Optional[str] = None
    min_pan_deg: Optional[float] = -45.0
    max_pan_deg: Optional[float] = 45.0
    min_tilt_deg: Optional[float] = -45.0
    max_tilt_deg: Optional[float] = 45.0
    message: Optional[str] = None


class PerformanceMetrics(BaseModel):
    fps: Optional[float] = None
    acquisition_time: Optional[float] = None
    average_error: Optional[float] = None
    maximum_error: Optional[float] = None
    rms_error: Optional[float] = None
    target_loss_percentage: Optional[float] = None
    reacquisition_time: Optional[float] = None
    tracking_success_percentage: Optional[float] = None
    detection_confidence: Optional[float] = None
    detection_rate: Optional[float] = None
    frames_processed: Optional[int] = None
    target_loss_events: Optional[int] = None
    detector_mode: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_inference_ms: Optional[float] = None
    time_series: Optional[List[Dict[str, Any]]] = None


class ReportResults(PerformanceMetrics):
    duration: Optional[float] = None


class Report(BaseModel):
    experiment_id: Optional[str] = None
    timestamp: Optional[str] = None
    simulation_config: Optional[Dict[str, Any]] = None
    target_config: Optional[Dict[str, Any]] = None
    disturbances: Optional[Dict[str, Any]] = None
    pid: Optional[Dict[str, Any]] = None
    tracking_algorithm: Optional[str] = None
    results: Optional[ReportResults] = None
    notes: Optional[str] = None


class VideoResults(BaseModel):
    detection_rate: Optional[float] = None
    tracking_success_percentage: Optional[float] = None
    average_error: Optional[float] = None
    maximum_error: Optional[float] = None
    rms_error: Optional[float] = None
    target_loss_percentage: Optional[float] = None
    reacquisition_time: Optional[float] = None
    acquisition_time: Optional[float] = None


class VideoUploadResponse(BaseModel):
    success: bool = True
    video_id: Optional[str] = None
    video_name: Optional[str] = None
    message: Optional[str] = None


class VideoStatus(BaseModel):
    video_id: Optional[str] = None
    video_name: Optional[str] = None
    status: str = "IDLE"
    fps: Optional[float] = None
    frames_processed: Optional[int] = None
    total_frames: Optional[int] = None
    progress: Optional[float] = None
    message: Optional[str] = None
    results: Optional[VideoResults] = None

