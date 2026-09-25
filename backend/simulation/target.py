"""Target models and multi-target manager for FSOC simulation."""

import math
from typing import Dict, List, Optional, Tuple
from backend.models.schemas import TargetConfig, TrajectoryEnum
from backend.simulation.trajectories import (
    BaseTrajectory,
    CircularTrajectory,
    Figure8Trajectory,
    RandomTrajectory,
    StraightTrajectory,
    create_trajectory,
)


class TargetInstance:
    """Individual optical beacon target instance in world space."""

    def __init__(
        self,
        target_id: int,
        trajectory: BaseTrajectory,
        beacon_size: float = 12.0,
        designated: bool = False,
    ):
        self.target_id = target_id
        self.trajectory = trajectory
        self.beacon_size = beacon_size
        self.designated = designated

        # State in world pixel coordinates (center is 1000, 1000 on 2000x2000 canvas)
        self.world_x: float = 1000.0
        self.world_y: float = 1000.0

        # State in camera sensor coordinates (relative to current viewport)
        self.cam_x: Optional[float] = None
        self.cam_y: Optional[float] = None
        self.is_in_fov: bool = False

        # Detection & tracking state
        self.detected: bool = False
        self.confidence: float = 0.0
        self.predicted_x: Optional[float] = None
        self.predicted_y: Optional[float] = None
        self.uncertainty: float = 1.0

    def update_world_position(self, t: float) -> Tuple[float, float]:
        """Evaluate trajectory to compute world position at time t."""
        self.world_x, self.world_y = self.trajectory.get_position(t)
        return self.world_x, self.world_y


class TargetManager:
    """Manages optical beacon targets, trajectories, and designated target selection."""

    def __init__(self, config: Optional[TargetConfig] = None):
        self.config = config or TargetConfig()
        self.targets: Dict[int, TargetInstance] = {}
        self.initialize_targets()

    def initialize_targets(self) -> None:
        """Create target instances based on configuration."""
        self.targets.clear()
        base_speed = float(self.config.speed)
        base_size = float(self.config.beacon_size)
        traj_type = self.config.trajectory.value
        designated_id = self.config.designated_id

        # Target 1: Primary trajectory
        primary_traj = create_trajectory(
            trajectory_type=traj_type,
            speed=base_speed,
            center_x=1000.0,
            center_y=1000.0,
            radius=250.0,
            phase=0.0,
        )
        self.targets[1] = TargetInstance(
            target_id=1,
            trajectory=primary_traj,
            beacon_size=base_size,
            designated=(designated_id == 1),
        )

        # Multi-target generation if count > 1
        count = max(1, min(self.config.count, 10))
        for i in range(2, count + 1):
            phase_offset = (i - 1) * (2.0 * math.pi / count)
            speed_mult = 0.8 + 0.15 * (i % 3)
            size_var = base_size * (0.8 + 0.1 * (i % 3))

            # Alternate trajectory shapes or offsets for decoys / secondary terminals
            if i % 3 == 0:
                decoy_traj: BaseTrajectory = Figure8Trajectory(
                    center_x=1000.0 + 80.0 * (i - 1),
                    center_y=1000.0 - 50.0 * (i - 1),
                    speed=base_speed * speed_mult,
                    scale=300.0,
                    phase=phase_offset,
                )
            elif i % 2 == 0:
                decoy_traj = CircularTrajectory(
                    center_x=1000.0 - 60.0 * (i - 1),
                    center_y=1000.0 + 60.0 * (i - 1),
                    speed=base_speed * speed_mult,
                    radius=280.0 + 30.0 * i,
                    phase=phase_offset,
                )
            else:
                decoy_traj = StraightTrajectory(
                    center_x=1000.0,
                    center_y=1000.0,
                    speed=base_speed * speed_mult,
                    heading_rad=phase_offset,
                )

            self.targets[i] = TargetInstance(
                target_id=i,
                trajectory=decoy_traj,
                beacon_size=size_var,
                designated=(designated_id == i),
            )

        # If designated ID not in targets, default target 1 as designated
        if designated_id not in self.targets and len(self.targets) > 0:
            first_key = next(iter(self.targets))
            self.targets[first_key].designated = True

    def reconfigure(self, config: TargetConfig) -> None:
        """Update configuration and reinitialize targets."""
        self.config = config
        self.initialize_targets()

    def update(self, t: float) -> List[TargetInstance]:
        """Update world position of all targets at simulation time t."""
        for target in self.targets.values():
            target.update_world_position(t)
        return list(self.targets.values())

    def get_designated_target(self) -> Optional[TargetInstance]:
        """Get the primary designated target being tracked."""
        for target in self.targets.values():
            if target.designated:
                return target
        if self.targets:
            return next(iter(self.targets.values()))
        return None
