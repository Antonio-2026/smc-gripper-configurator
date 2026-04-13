from __future__ import annotations

import time
from dataclasses import dataclass

import serial
from serial import SerialException

from gripper_control.core.gripper_base import ConnectionError
from gripper_control.utils.logger import configure_logger


@dataclass(slots=True)
class SerialConfig:
    port: str
    baudrate: int = 115200
    bytesize: int = serial.EIGHTBITS
    parity: str = serial.PARITY_NONE
    stopbits: int = serial.STOPBITS_ONE
    timeout: float = 0.2
    reconnect_attempts: int = 3
    reconnect_interval: float = 0.5


class SerialRS485:
    def __init__(self, timeout: float = 0.2) -> None:
        self.logger = configure_logger("gripper_control.serial")
        self._serial: serial.Serial | None = None
        self._config: SerialConfig | None = None
        self.timeout = timeout

    @property
    def is_open(self) -> bool:
        return self._serial is not None and self._serial.is_open

    def open(self, port: str, baudrate: int = 115200, timeout: float | None = None) -> None:
        timeout_value = timeout if timeout is not None else self.timeout
        self._config = SerialConfig(port=port, baudrate=baudrate, timeout=timeout_value)
        self._connect_with_retry(self._config)

    def _connect_with_retry(self, config: SerialConfig) -> None:
        last_error: Exception | None = None
        for attempt in range(1, config.reconnect_attempts + 1):
            try:
                self._serial = serial.Serial(
                    port=config.port,
                    baudrate=config.baudrate,
                    bytesize=config.bytesize,
                    parity=config.parity,
                    stopbits=config.stopbits,
                    timeout=config.timeout,
                )
                self.logger.info("RS485 conectado em %s @ %s", config.port, config.baudrate)
                return
            except SerialException as exc:
                last_error = exc
                self.logger.warning("Falha conexão RS485 tentativa %s/%s: %s", attempt, config.reconnect_attempts, exc)
                time.sleep(config.reconnect_interval)
        raise ConnectionError(f"Não foi possível conectar na serial {config.port}: {last_error}")

    def close(self) -> None:
        if self._serial is not None and self._serial.is_open:
            self._serial.close()
            self.logger.info("RS485 desconectado")

    def send(self, data: bytes) -> None:
        if not self.is_open:
            self._reconnect_or_raise()
        assert self._serial is not None
        self.logger.info("TX: %s", data.hex(" "))
        self._serial.write(data)

    def receive(self, size: int = 7) -> bytes:
        if not self.is_open:
            self._reconnect_or_raise()
        assert self._serial is not None
        data = self._serial.read(size)
        self.logger.info("RX: %s", data.hex(" "))
        return data

    def _reconnect_or_raise(self) -> None:
        if self._config is None:
            raise ConnectionError("Configuração serial ausente para reconexão")
        self.logger.warning("Serial fechada. Tentando reconectar automaticamente.")
        self._connect_with_retry(self._config)
