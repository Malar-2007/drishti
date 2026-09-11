# DRISHTI Drone Agent: Jetson Orin Nano Companion Gateway

The **DRISHTI Drone Agent** is a lightweight, high-reliability Python telemetry daemon designed to run aboard an **NVIDIA Jetson Orin Nano** companion computer. It bridges the **Pixhawk 2.4.8** flight controller with the **DRISHTI Render Cloud Backend**.

---

## Architecture Flow

```
┌─────────────────┐             ┌───────────────────────────┐             ┌─────────────────────┐             ┌───────────────────┐
│  Pixhawk 2.4.8  │ ──MAVLink──>│     Jetson Orin Nano      │ ──HTTPS───> │   Render Backend    │ ──WebSocket─> │  React Dashboard  │
│ Flight Control  │   (UART/UDP)│ DRISHTI Drone Agent       │  (TLS/Auth) │ Express Telemetry   │   (Sub-sec)   │ Live Telemetry HUD│
└─────────────────┘             └───────────────────────────┘             └─────────────────────┘             └───────────────────┘
```

### Safety & Architectural Principles
1. **No Direct Web-to-Flight-Controller Links**: The React dashboard never directly communicates with or addresses the Pixhawk. The Jetson Orin Nano acts as an isolated, secure gateway.
2. **Zero Autonomous Command Injection**: The agent operates strictly in **read-only telemetry mode** (reading GPS, ground speed, battery, altitude, flight mode, and armed status). It does NOT send dangerous override flight commands over the wire.
3. **Dual Mode Support**: Supports both physical hardware MAVLink parsing and standalone **Simulation Bench-Test Mode** (`--demo`) for testing before physical drone integration.

---

## 1. Physical Hardware Wiring (Pixhawk to Jetson)

Connect Pixhawk **TELEM1** (or **TELEM2**) to the Jetson Orin Nano **40-Pin Expansion Header**:

| Pixhawk TELEM1 Pin | Wire Color | Signal Description | Jetson Orin Nano 40-Pin Header | Header Pin Number |
| :--- | :--- | :--- | :--- | :--- |
| **Pin 1 (VCC)** | Red | +5V Power | *DO NOT CONNECT* (Power Jetson via barrel jack / dedicated BEC) | — |
| **Pin 2 (TX)** | Orange | Pixhawk TX (Telemetry Out) | **UART1_RX** | **Pin 10** |
| **Pin 3 (RX)** | Yellow | Pixhawk RX (Telemetry In) | **UART1_TX** | **Pin 8** |
| **Pin 4 (CTS)** | Green | Clear To Send (Flow Control) | *Optional* | — |
| **Pin 5 (RTS)** | Blue | Request To Send | *Optional* | — |
| **Pin 6 (GND)** | Black | Common Ground | **GND** | **Pin 6 or Pin 9** |

*Alternative (Plug-and-Play USB)*: Connect the Pixhawk micro-USB port to any USB 3.0 port on the Jetson Orin Nano. The device will enumerate as `/dev/ttyACM0`.

---

## 2. Pixhawk Autopilot Configuration (ArduPilot / PX4)

Connect to the Pixhawk using Mission Planner or QGroundControl and verify the following parameters:

```ini
# When connected to TELEM1 via 40-pin UART (/dev/ttyTHS1):
SERIAL1_PROTOCOL = 2        # 2: MAVLink 2.0
SERIAL1_BAUD     = 921      # 921600 baud rate (high bandwidth for telemetry)

# When connected via USB (/dev/ttyACM0):
SERIAL0_PROTOCOL = 2        # 2: MAVLink 2.0

# Telemetry Stream Rates (Hz):
SR1_POSITION     = 5        # Global Position & Coordinates @ 5 Hz
SR1_EXTRA1       = 5        # Attitude & Roll/Pitch @ 5 Hz
SR1_EXTRA2       = 2        # VFR_HUD & Ground Speed @ 2 Hz
SR1_STATUS       = 2        # Battery & System Status @ 2 Hz
```

---

## 3. Jetson Orin Nano Software Setup

### Prerequisites
On the Jetson Orin Nano (Ubuntu 22.04 LTS):

```bash
# 1. Grant user permission to access UART serial ports
sudo usermod -a -G dialout $USER

# 2. Disable serial console on ttyTHS1 (frees UART port for MAVLink)
sudo systemctl stop nvgetty
sudo systemctl disable nvgetty

# 3. Clone or copy drone-agent/ to Jetson
cd /home/jetson/drishti/drone-agent

# 4. Install Python dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 4. Configuration (`config.json`)

Edit `config.json` to configure the target backend and connection parameters:

```json
{
  "drone_id": "DRONE-01",
  "flight_controller": "Pixhawk 2.4.8",
  "companion_computer": "Jetson Orin Nano",
  "connection": {
    "type": "udp",
    "address": "0.0.0.0",
    "port": 14550,
    "serial_device": "/dev/ttyTHS1",
    "baud_rate": 921600
  },
  "backend": {
    "url": "https://drishti-dg9e.onrender.com/api/drone-telemetry",
    "api_key": "YOUR_DRONE_API_KEY",
    "poll_interval_sec": 1.0
  }
}
```

> **Security Note**: Never commit actual drone credentials to version control. The agent supports passing the secret key securely via the `DRONE_API_KEY` environment variable (`export DRONE_API_KEY="your-secret-token"`) or via the `--api-key` CLI flag.

---

## 5. Running the Drone Agent

### Physical Drone Mode (Connected to Pixhawk)
```bash
# In active virtual environment:
python3 agent.py
```

### Bench-Test Simulation Mode (No Physical Hardware Needed)
To test the complete cloud telemetry pipeline without connecting a physical Pixhawk:
```bash
python3 agent.py --demo
```
The agent generates realistic MAVLink telemetry frames, authenticates with the Render backend, and broadcasts telemetry to the React dashboard in real time.

---

## 6. Systemd Background Daemon (Autostart on Boot)

To ensure the DRISHTI Drone Agent starts automatically upon powering on the drone:

Create `/etc/systemd/system/drishti-drone-agent.service`:

```ini
[Unit]
Description=DRISHTI Drone Companion Gateway Agent (Jetson Orin Nano)
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=jetson
WorkingDirectory=/home/jetson/drishti/drone-agent
ExecStart=/home/jetson/drishti/drone-agent/venv/bin/python3 /home/jetson/drishti/drone-agent/agent.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable drishti-drone-agent.service
sudo systemctl start drishti-drone-agent.service
sudo systemctl status drishti-drone-agent.service
```
