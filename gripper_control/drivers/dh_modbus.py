from __future__ import annotations

import time

from pymodbus.client import ModbusSerialClient
from pymodbus.exceptions import ModbusException

from gripper_control.core.gripper_base import CommandError, ConnectionError, GripperBase
from gripper_control.core.models import GripperStatus
from gripper_control.utils.crc16 import append_crc16
from gripper_control.utils.logger import configure_logger


class DHModbusGripper(GripperBase):
    REG_INIT = 0x0100
    REG_FORCE = 0x0101
    REG_POSITION = 0x0103
    REG_SPEED = 0x0104
    REG_STATUS = 0x0201

    def __init__(
        self,
        port: str,
        slave_id: int = 1,
        baudrate: int = 115200,
        timeout: float = 0.2,
        reconnect_attempts: int = 3,
    ) -> None:
        super().__init__(name="DH Modbus RTU")
        self.logger = configure_logger("gripper_control.dh_modbus")
        self.port = port
        self.slave_id = slave_id
        self.baudrate = baudrate
        self.timeout = timeout
        self.reconnect_attempts = reconnect_attempts
        self.client = ModbusSerialClient(
            port=self.port,
            baudrate=self.baudrate,
            timeout=self.timeout,
            parity="N",
            stopbits=1,
            bytesize=8,
            method="rtu",
        )
        self._last_force = 20
        self._last_speed = 50
        self._last_position = 0

    def connect(self) -> None:
        for attempt in range(1, self.reconnect_attempts + 1):
            if self.client.connect():
                self._connected = True
                self.logger.info("Conectado ao gripper DH em %s", self.port)
                return
            self.logger.warning("Falha ao conectar tentativa %s/%s", attempt, self.reconnect_attempts)
            time.sleep(0.4)
        raise ConnectionError(f"Falha ao conectar no gripper DH em {self.port}")

    def disconnect(self) -> None:
        self.client.close()
        self._connected = False
        self.logger.info("Desconectado do gripper DH")

    def _ensure_connection(self) -> None:
        if not self._connected:
            self.logger.warning("Cliente desconectado, tentando reconectar")
            self.connect()

    def _write_register(self, address: int, value: int) -> None:
        self._ensure_connection()
        frame = bytes((self.slave_id, 0x06, (address >> 8) & 0xFF, address & 0xFF, (value >> 8) & 0xFF, value & 0xFF))
        self.logger.info("CMD raw+crc: %s", append_crc16(frame).hex(" "))
        try:
            response = self.client.write_register(address=address, value=value, slave=self.slave_id)
        except ModbusException as exc:
            raise CommandError(f"Erro Modbus ao escrever registrador 0x{address:04X}: {exc}") from exc
        if response.isError():
            raise CommandError(f"Erro de escrita registrador 0x{address:04X}: {response}")

    def _read_register(self, address: int) -> int:
        self._ensure_connection()
        try:
            response = self.client.read_holding_registers(address=address, count=1, slave=self.slave_id)
        except ModbusException as exc:
            raise CommandError(f"Erro Modbus ao ler registrador 0x{address:04X}: {exc}") from exc
        if response.isError():
            raise CommandError(f"Erro de leitura registrador 0x{address:04X}: {response}")
        return int(response.registers[0])

    def initialize(self) -> None:
        self._write_register(self.REG_INIT, 1)

    def open(self) -> None:
        self.set_position(0)

    def close(self) -> None:
        self.set_position(1000)

    def stop(self) -> None:
        status = self.get_status()
        self.set_position(status.position)

    def set_position(self, value: int) -> None:
        if not 0 <= value <= 1000:
            raise ValueError("Posição deve estar entre 0 e 1000")
        self._write_register(self.REG_POSITION, value)
        self._last_position = value

    def set_force(self, value: int) -> None:
        if not 20 <= value <= 100:
            raise ValueError("Força deve estar entre 20 e 100")
        self._write_register(self.REG_FORCE, value)
        self._last_force = value

    def set_speed(self, value: int) -> None:
        if not 1 <= value <= 100:
            raise ValueError("Velocidade deve estar entre 1 e 100")
        self._write_register(self.REG_SPEED, value)
        self._last_speed = value

    def get_status(self) -> GripperStatus:
        raw = self._read_register(self.REG_STATUS)
        initialized = bool(raw & 0x0001)
        moving = bool(raw & 0x0002)
        object_detected = bool(raw & 0x0004)
        error_code = (raw >> 8) & 0x00FF
        return GripperStatus(
            connected=self._connected,
            initialized=initialized,
            position=self._last_position,
            force=self._last_force,
            speed=self._last_speed,
            object_detected=object_detected,
            moving=moving,
            error_code=error_code,
            raw_status=raw,
        )
