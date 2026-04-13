from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class GripperHealth(Enum):
    """Estados principais de saúde do gripper para exibição no UI."""

    READY = "ready"
    OBJECT_DETECTED = "object_detected"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass(slots=True)
class GripperStatus:
    """Status universal retornado por drivers de grippers."""

    connected: bool
    initialized: bool
    position: int
    force: int
    speed: int
    object_detected: bool
    moving: bool
    error_code: int
    raw_status: int

    @property
    def health(self) -> GripperHealth:
        if self.error_code != 0:
            return GripperHealth.ERROR
        if self.object_detected:
            return GripperHealth.OBJECT_DETECTED
        if self.initialized and self.connected:
            return GripperHealth.READY
        return GripperHealth.UNKNOWN
