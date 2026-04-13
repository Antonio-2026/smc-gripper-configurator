from __future__ import annotations

import argparse
import sys

from PyQt5.QtWidgets import QApplication

from gripper_control.core.gripper_base import GripperDriverRegistry
from gripper_control.drivers.dh_modbus import DHModbusGripper
from gripper_control.drivers.smc_lehr import SMCLEHRGripper
from gripper_control.ui.main_window import GripperController, MainWindow
from gripper_control.utils.logger import configure_logger


def build_registry() -> GripperDriverRegistry:
    registry = GripperDriverRegistry()
    registry.register("dh_modbus", DHModbusGripper)
    registry.register("smc_lehr", SMCLEHRGripper)
    return registry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Universal Industrial Gripper Control")
    parser.add_argument("--driver", default="dh_modbus", help="Driver a utilizar (dh_modbus, smc_lehr)")
    parser.add_argument("--port", default="COM1", help="Porta serial (ex: COM3, /dev/ttyUSB0)")
    parser.add_argument("--slave-id", default=1, type=int, help="Slave ID Modbus")
    parser.add_argument("--baudrate", default=115200, type=int, help="Baudrate RS485")
    parser.add_argument("--timeout", default=0.2, type=float, help="Timeout Modbus/serial em segundos")
    return parser.parse_args()


def create_driver(args: argparse.Namespace):
    registry = build_registry()
    driver_cls = registry.get(args.driver)
    if args.driver == "dh_modbus":
        return driver_cls(port=args.port, slave_id=args.slave_id, baudrate=args.baudrate, timeout=args.timeout)
    return driver_cls()


def main() -> int:
    logger = configure_logger()
    args = parse_args()
    driver = create_driver(args)
    logger.info("Inicializando aplicação com driver %s", driver.name)

    app = QApplication(sys.argv)
    controller = GripperController(driver)
    window = MainWindow(controller)
    window.show()
    return app.exec_()


if __name__ == "__main__":
    raise SystemExit(main())
