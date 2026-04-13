from __future__ import annotations

from collections import deque

from PyQt5.QtCore import QTimer, Qt
from PyQt5.QtGui import QColor, QPainter, QPen
from PyQt5.QtWidgets import (
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from gripper_control.core.gripper_base import GripperBase, GripperError
from gripper_control.core.models import GripperHealth
from gripper_control.utils.logger import configure_logger


class PositionTrendWidget(QWidget):
    """Gráfico simples da posição recente."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setMinimumHeight(120)
        self._samples = deque(maxlen=80)

    def add_sample(self, position_pct: int) -> None:
        self._samples.append(max(0, min(100, position_pct)))
        self.update()

    def paintEvent(self, event) -> None:  # type: ignore[override]
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor("#121826"))
        if len(self._samples) < 2:
            return

        width = self.width()
        height = self.height()
        step = width / max(1, len(self._samples) - 1)

        pen = QPen(QColor("#00d4ff"))
        pen.setWidth(2)
        painter.setPen(pen)

        points = []
        for i, value in enumerate(self._samples):
            x = int(i * step)
            y = int(height - (value / 100) * height)
            points.append((x, y))

        for i in range(len(points) - 1):
            painter.drawLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])


class GripperController:
    """Camada de controle para desacoplar UI do driver."""

    def __init__(self, driver: GripperBase):
        self.driver = driver

    def connect(self) -> None:
        self.driver.connect()

    def initialize(self) -> None:
        self.driver.initialize()

    def open(self) -> None:
        self.driver.open()

    def close(self) -> None:
        self.driver.close()

    def stop(self) -> None:
        self.driver.stop()

    def set_position_percent(self, value_pct: int) -> None:
        value = int((value_pct / 100) * 1000)
        self.driver.set_position(value)

    def set_force(self, value: int) -> None:
        self.driver.set_force(value)

    def set_speed(self, value: int) -> None:
        self.driver.set_speed(max(1, value))


class MainWindow(QMainWindow):
    def __init__(self, controller: GripperController):
        super().__init__()
        self.logger = configure_logger("gripper_control.ui")
        self.controller = controller

        self.setWindowTitle("Universal Industrial Gripper Control")
        self.resize(760, 520)

        central = QWidget(self)
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        layout.addWidget(self._build_control_group())
        layout.addWidget(self._build_buttons_group())
        layout.addWidget(self._build_status_group())

        self.timer = QTimer(self)
        self.timer.setInterval(350)
        self.timer.timeout.connect(self._refresh_status)

    def _build_control_group(self) -> QGroupBox:
        group = QGroupBox("Parâmetros")
        grid = QGridLayout(group)

        self.position_slider = self._create_slider(0, 100, 0)
        self.force_slider = self._create_slider(20, 100, 20)
        self.speed_slider = self._create_slider(0, 100, 50)

        self.position_value = QLabel("0%")
        self.force_value = QLabel("20%")
        self.speed_value = QLabel("50%")

        self.position_slider.valueChanged.connect(lambda v: self._on_slider_change("position", v))
        self.force_slider.valueChanged.connect(lambda v: self._on_slider_change("force", v))
        self.speed_slider.valueChanged.connect(lambda v: self._on_slider_change("speed", v))

        grid.addWidget(QLabel("Posição"), 0, 0)
        grid.addWidget(self.position_slider, 0, 1)
        grid.addWidget(self.position_value, 0, 2)

        grid.addWidget(QLabel("Força"), 1, 0)
        grid.addWidget(self.force_slider, 1, 1)
        grid.addWidget(self.force_value, 1, 2)

        grid.addWidget(QLabel("Velocidade"), 2, 0)
        grid.addWidget(self.speed_slider, 2, 1)
        grid.addWidget(self.speed_value, 2, 2)
        return group

    def _build_buttons_group(self) -> QGroupBox:
        group = QGroupBox("Comandos")
        row = QHBoxLayout(group)

        self.btn_connect = QPushButton("Connect")
        self.btn_initialize = QPushButton("Initialize")
        self.btn_open = QPushButton("Open")
        self.btn_close = QPushButton("Close")
        self.btn_stop = QPushButton("Stop")

        self.btn_connect.clicked.connect(self._on_connect)
        self.btn_initialize.clicked.connect(lambda: self._safe_action(self.controller.initialize))
        self.btn_open.clicked.connect(lambda: self._safe_action(self.controller.open))
        self.btn_close.clicked.connect(lambda: self._safe_action(self.controller.close))
        self.btn_stop.clicked.connect(lambda: self._safe_action(self.controller.stop))

        for btn in [self.btn_connect, self.btn_initialize, self.btn_open, self.btn_close, self.btn_stop]:
            row.addWidget(btn)

        return group

    def _build_status_group(self) -> QGroupBox:
        group = QGroupBox("Monitoramento")
        layout = QVBoxLayout(group)

        line = QHBoxLayout()
        self.status_label = QLabel("Status: desconectado")
        self.indicator = QLabel("●")
        self.indicator.setStyleSheet("font-size: 24px; color: #808080;")

        line.addWidget(self.status_label)
        line.addWidget(self.indicator)
        line.addStretch()

        self.trend = PositionTrendWidget()

        layout.addLayout(line)
        layout.addWidget(self.trend)
        return group

    @staticmethod
    def _create_slider(minimum: int, maximum: int, initial: int) -> QSlider:
        slider = QSlider(Qt.Horizontal)
        slider.setRange(minimum, maximum)
        slider.setValue(initial)
        return slider

    def _on_connect(self) -> None:
        self._safe_action(self.controller.connect)
        self.timer.start()

    def _on_slider_change(self, target: str, value: int) -> None:
        try:
            if target == "position":
                self.position_value.setText(f"{value}%")
                self.controller.set_position_percent(value)
            elif target == "force":
                self.force_value.setText(f"{value}%")
                self.controller.set_force(value)
            else:
                self.speed_value.setText(f"{value}%")
                self.controller.set_speed(value)
        except GripperError as exc:
            self._show_error(str(exc))
        except Exception as exc:
            self._show_error(f"Falha ao alterar {target}: {exc}")

    def _safe_action(self, action) -> None:
        try:
            action()
            self._refresh_status()
        except Exception as exc:
            self._show_error(str(exc))

    def _refresh_status(self) -> None:
        try:
            status = self.controller.driver.get_status()
        except Exception as exc:
            self.logger.error("Falha ao atualizar status: %s", exc)
            return

        msg = (
            f"Status: connected={status.connected}, init={status.initialized}, "
            f"pos={status.position}, moving={status.moving}, err={status.error_code}"
        )
        self.status_label.setText(msg)
        self.trend.add_sample(int((status.position / 1000) * 100))

        color_map = {
            GripperHealth.OBJECT_DETECTED: "#00ff00",
            GripperHealth.READY: "#00a6ff",
            GripperHealth.ERROR: "#ff2d2d",
            GripperHealth.UNKNOWN: "#808080",
        }
        color = color_map.get(status.health, "#808080")
        self.indicator.setStyleSheet(f"font-size: 24px; color: {color};")

    def _show_error(self, message: str) -> None:
        self.logger.error(message)
        QMessageBox.critical(self, "Erro", message)
