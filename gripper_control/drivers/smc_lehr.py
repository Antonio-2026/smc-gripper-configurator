from __future__ import annotations

from gripper_control.core.gripper_base import GripperBase
from gripper_control.core.models import GripperStatus


class SMCLEHRGripper(GripperBase):
    """Placeholder de driver futuro para garras SMC LEHR."""

    def __init__(self) -> None:
        super().__init__(name="SMC LEHR (placeholder)")

    def connect(self) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def disconnect(self) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def initialize(self) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def open(self) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def close(self) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def stop(self) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def set_position(self, value: int) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def set_force(self, value: int) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def set_speed(self, value: int) -> None:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")

    def get_status(self) -> GripperStatus:
        raise NotImplementedError("Driver SMC LEHR ainda não implementado")
