# Universal Industrial Gripper Control (Python)

Aplicação desktop em **Python 3.10+** para controle universal de garras elétricas industriais via **RS485 / Modbus RTU**, com arquitetura modular para expansão de drivers.

## Recursos

- Interface universal de driver (`GripperBase`) com operações padrão:
  - conectar / desconectar
  - inicializar
  - abrir / fechar / parar
  - set de posição, força e velocidade
  - leitura de status
- Driver funcional para **DH Robotics (Modbus RTU)**
- Comunicação serial dedicada (`SerialRS485`) com retry e logs
- UI moderna em **PyQt5** com:
  - sliders de posição, força e velocidade
  - botões de comando (Connect, Initialize, Open, Close, Stop)
  - indicador de status por cor (verde, azul, vermelho)
  - gráfico simples de tendência da posição
- Logging centralizado em arquivo e console
- Arquitetura plugável para novos drivers (ex.: placeholder `SMCLEHRGripper`)

## Estrutura

```text
gripper_control/
├── main.py
├── core/
│   ├── gripper_base.py
│   └── models.py
├── drivers/
│   ├── dh_modbus.py
│   └── smc_lehr.py
├── communication/
│   └── serial_rs485.py
├── ui/
│   └── main_window.py
└── utils/
    ├── crc16.py
    └── logger.py
```

## Dependências

Instale com:

```bash
pip install pyserial pymodbus PyQt5
```

## Execução

### Driver DH Modbus

```bash
python -m gripper_control.main --driver dh_modbus --port COM3 --slave-id 1 --baudrate 115200 --timeout 0.2
```

No Linux, exemplo de porta:

```bash
python -m gripper_control.main --driver dh_modbus --port /dev/ttyUSB0
```

### Driver placeholder SMC LEHR

```bash
python -m gripper_control.main --driver smc_lehr
```

> O driver SMC LEHR está preparado como extensão futura e ainda não implementa protocolo real.

## Logs

Os logs são gravados em:

```text
logs/gripper_control.log
```

Inclui:

- INFO/WARNING/ERROR
- comandos e respostas seriais/modbus
- eventos de conexão/reconexão

## Expansão para novos drivers

1. Crie um novo arquivo em `gripper_control/drivers/`.
2. Herde de `GripperBase`.
3. Implemente os métodos abstratos.
4. Registre no `build_registry()` em `main.py`.

