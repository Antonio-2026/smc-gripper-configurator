from __future__ import annotations

from abc import ABC, abstractmethod

from .models import GripperStatus


class GripperError(Exception):
    """Erro genérico de operação de gripper."""


class ConnectionError(GripperError):
    """Erro de conexão com o gripper."""


class CommandError(GripperError):
    """Erro ao enviar/receber comandos do gripper."""


class GripperBase(ABC):
    """Interface universal para drivers de grippers industriais."""

    def __init__(self, name: str) -> None:
        self.name = name
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    @abstractmethod
    def connect(self) -> None:
        """Conecta no hardware de gripper."""

    @abstractmethod
    def disconnect(self) -> None:
        """Desconecta do hardware de gripper."""

    @abstractmethod
    def initialize(self) -> None:
        """Executa sequência de inicialização/homing do gripper."""

    @abstractmethod
    def open(self) -> None:
        """Abre totalmente o gripper."""

    @abstractmethod
    def close(self) -> None:
        """Fecha totalmente o gripper."""

    @abstractmethod
    def stop(self) -> None:
        """Para o movimento atual do gripper."""

    @abstractmethod
    def set_position(self, value: int) -> None:
        """Define posição de referência do gripper."""

    @abstractmethod
    def set_force(self, value: int) -> None:
        """Define força de atuação do gripper."""

    @abstractmethod
    def set_speed(self, value: int) -> None:
        """Define velocidade de atuação do gripper."""

    @abstractmethod
    def get_status(self) -> GripperStatus:
        """Lê status atual do gripper."""


class GripperDriverRegistry:
    """Registro simples de drivers para arquitetura plugável."""

    def __init__(self) -> None:
        self._drivers: dict[str, type[GripperBase]] = {}

    def register(self, key: str, driver_cls: type[GripperBase]) -> None:
        self._drivers[key.lower()] = driver_cls

    def get(self, key: str) -> type[GripperBase]:
        try:
            return self._drivers[key.lower()]
        except KeyError as exc:
            raise GripperError(f"Driver '{key}' não registrado") from exc

    def available(self) -> list[str]:
        return sorted(self._drivers.keys())
