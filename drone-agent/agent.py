#!/usr/bin/env python3
"""
DRISHTI Drone Agent (Jetson Orin Nano Companion Gateway)
=========================================================
Monitors Pixhawk flight controller telemetry over MAVLink (Serial UART / UDP),
extracts avionics metrics, and transmits authenticated telemetry frames to the
DRISHTI Render Cloud Backend.

HARDWARE & ARCHITECTURAL SPECIFICATION:
- Companion Computer: NVIDIA Jetson Orin Nano (Ubuntu 22.04 LTS)
- Flight Controller:  Pixhawk 2.4.8 (ArduPilot Copter / PX4 Autopilot)
- Telemetry Bus:      MAVLink 2.0 via UART (/dev/ttyTHS1 @ 921600) or UDP (0.0.0.0:14550)
- Cloud Gateway:      HTTPS POST / WebSocket to DRISHTI Backend (/api/drone-telemetry)

SAFETY NOTICE:
Strictly read-only telemetry acquisition. Does NOT issue autonomous flight commands.
"""

import os
import sys
import time
import json
import socket
import argparse
import logging
from typing import Dict, Any, Optional

try:
    import requests
except ImportError:
    requests = None

try:
    from pymavlink import mavutil
except ImportError:
    mavutil = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[DRISHTI-AGENT %(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("DrishtiAgent")


class DrishtiDroneAgent:
    """
    Companion computer agent running on Jetson Orin Nano.
    """

    def __init__(self, config_path: str = "config.json", demo_mode: bool = False, api_key: Optional[str] = None):
        self.config_path = config_path
        self.demo_mode = demo_mode
        self.config = self._load_config()
        self.drone_id = self.config.get("drone_id", "DRONE-01")
        self.backend_url = self.config.get("backend", {}).get(
            "url", "https://drishti-dg9e.onrender.com/api/drone-telemetry"
        )
        # Priority: explicit arg > env var > config.json placeholder
        self.api_key = (
            api_key
            or os.environ.get("DRONE_API_KEY")
            or os.environ.get("DRISHTI_DRONE_API_KEY")
            or self.config.get("backend", {}).get("api_key", "YOUR_DRONE_API_KEY")
        )
        if not self.api_key or self.api_key == "YOUR_DRONE_API_KEY":
            logger.warning("DRONE_API_KEY is using a placeholder or is unset. Telemetry may be rejected by the backend. Set DRONE_API_KEY environment variable or pass --api-key.")
        self.poll_interval = self.config.get("backend", {}).get("poll_interval_sec", 1.0)
        self.local_ip = self._get_local_ip()

        # Telemetry Cache
        self.telemetry = {
            "droneId": self.drone_id,
            "latitude": 13.0827,
            "longitude": 80.2707,
            "altitude": 100.0,
            "speed": 12.0,
            "battery": 78,
            "gps": True,
            "armed": False,
            "flightMode": "GUIDED",
            "connectionType": self.config.get("connection", {}).get("type", "UDP").upper(),
            "jetsonIp": self.local_ip,
            "flightController": self.config.get("flight_controller", "Pixhawk 2.4.8"),
            "companionComputer": self.config.get("companion_computer", "Jetson Orin Nano"),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        self.mav_conn = None

    def _load_config(self) -> Dict[str, Any]:
        """Loads configuration from JSON file or provides robust defaults."""
        search_paths = [
            self.config_path,
            os.path.join(os.path.dirname(os.path.abspath(__file__)), self.config_path),
            "config.local.json",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.local.json"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json"),
        ]
        for path_candidate in search_paths:
            if path_candidate and os.path.exists(path_candidate):
                try:
                    with open(path_candidate, "r") as f:
                        cfg = json.load(f)
                        logger.info(f"Loaded drone configuration from {path_candidate}")
                        return cfg
                except Exception as e:
                    logger.warning(f"Could not parse {path_candidate} ({e}).")
        return {
            "drone_id": "DRONE-01",
            "flight_controller": "Pixhawk 2.4.8",
            "companion_computer": "Jetson Orin Nano",
            "connection": {"type": "udp", "address": "0.0.0.0", "port": 14550},
            "backend": {
                "url": "https://drishti-dg9e.onrender.com/api/drone-telemetry",
                "api_key": "YOUR_DRONE_API_KEY",
                "poll_interval_sec": 1.0
            }
        }

    def _get_local_ip(self) -> str:
        """Determines active local network IP address on Jetson."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "192.168.1.105"

    def connect_mavlink(self) -> bool:
        """
        Establishes MAVLink connection to Pixhawk flight controller.
        Supports UDP (default 14550) or Serial UART (/dev/ttyTHS1).
        """
        if self.demo_mode or mavutil is None:
            logger.info("Running in SIMULATION BENCH-TEST MODE (Physical Pixhawk bypass).")
            return True

        conn_cfg = self.config.get("connection", {})
        conn_type = conn_cfg.get("type", "udp").lower()

        try:
            if conn_type == "serial":
                dev = conn_cfg.get("serial_device", "/dev/ttyTHS1")
                baud = conn_cfg.get("baud_rate", 921600)
                logger.info(f"Connecting to Pixhawk Serial UART on {dev} @ {baud} baud...")
                self.mav_conn = mavutil.mavlink_connection(dev, baud=baud)
            else:
                addr = conn_cfg.get("address", "0.0.0.0")
                port = conn_cfg.get("port", 14550)
                uri = f"udpin:{addr}:{port}"
                logger.info(f"Listening for Pixhawk MAVLink UDP packets on {uri}...")
                self.mav_conn = mavutil.mavlink_connection(uri)

            # Wait for initial HEARTBEAT
            logger.info("Waiting for Pixhawk HEARTBEAT message...")
            hb = self.mav_conn.wait_heartbeat(timeout=8)
            if hb:
                logger.info(f"Pixhawk HEARTBEAT detected! System ID: {self.mav_conn.target_system}, Component ID: {self.mav_conn.target_component}")
                return True
            else:
                logger.warning("Heartbeat timeout. Falling back to benchmark simulation stream.")
                self.demo_mode = True
                return True
        except Exception as e:
            logger.warning(f"Could not establish physical MAVLink connection ({e}). Activating simulation fallback.")
            self.demo_mode = True
            return True

    def read_mavlink_telemetry(self):
        """
        Reads non-blocking MAVLink messages from Pixhawk buffer and updates telemetry dictionary.
        """
        if self.demo_mode or self.mav_conn is None:
            # Deterministic simulation updates for bench testing
            self.telemetry["battery"] = max(20, round(self.telemetry["battery"] - 0.05, 1))
            self.telemetry["speed"] = round(11.5 + (time.time() % 3) * 0.4, 1)
            self.telemetry["altitude"] = round(98.5 + (time.time() % 4) * 0.5, 1)
            self.telemetry["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
            return

        # Drain MAVLink queue
        while True:
            msg = self.mav_conn.recv_msg()
            if msg is None:
                break

            msg_type = msg.get_type()

            # 1. Global Position & Speed (GLOBAL_POSITION_INT)
            if msg_type == "GLOBAL_POSITION_INT":
                self.telemetry["latitude"] = round(msg.lat / 1e7, 6)
                self.telemetry["longitude"] = round(msg.lon / 1e7, 6)
                self.telemetry["altitude"] = round(msg.relative_alt / 1000.0, 1)
                # Compute groundspeed from vector components vx, vy
                vx = msg.vx / 100.0
                vy = msg.vy / 100.0
                self.telemetry["speed"] = round((vx**2 + vy**2)**0.5, 1)

            # 2. System Status & Battery (SYS_STATUS)
            elif msg_type == "SYS_STATUS":
                if msg.battery_remaining != -1:
                    self.telemetry["battery"] = msg.battery_remaining

            # 3. Heartbeat & Flight Mode & Armed State (HEARTBEAT)
            elif msg_type == "HEARTBEAT":
                # Check Armed state
                is_armed = bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
                self.telemetry["armed"] = is_armed

                # Decode Flight Mode
                mode_str = mavutil.mode_string_v10(msg)
                if mode_str:
                    self.telemetry["flightMode"] = mode_str.upper()

            # 4. GPS Fix Status (GPS_RAW_INT)
            elif msg_type == "GPS_RAW_INT":
                self.telemetry["gps"] = bool(msg.fix_type >= 2)

        self.telemetry["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")

    def push_telemetry_to_backend(self) -> bool:
        """
        Transmits authenticated telemetry payload to DRISHTI Render Cloud backend.
        """
        if requests is None:
            logger.error("Python 'requests' library not installed.")
            return False

        headers = {
            "Content-Type": "application/json",
            "x-drone-api-key": self.api_key
        }

        try:
            res = requests.post(
                self.backend_url,
                headers=headers,
                data=json.dumps(self.telemetry),
                timeout=3.0
            )
            if res.status_code == 200:
                logger.info(
                    f"Telemetry Frame Pushed -> Status: 200 OK | Drone: {self.telemetry['droneId']} | "
                    f"Bat: {self.telemetry['battery']}% | Alt: {self.telemetry['altitude']}m | "
                    f"Spd: {self.telemetry['speed']}m/s | Mode: {self.telemetry['flightMode']}"
                )
                return True
            else:
                logger.warning(f"Backend rejected telemetry (HTTP {res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.warning(f"Could not reach DRISHTI Backend at {self.backend_url}: {e}")
            return False

    def run(self):
        """Main agent loop."""
        logger.info("=========================================================")
        logger.info("   DRISHTI DRONE AGENT (JETSON ORIN NANO GATEWAY)       ")
        logger.info("=========================================================")
        logger.info(f"Target Backend:    {self.backend_url}")
        logger.info(f"Drone Identifier:  {self.drone_id}")
        logger.info(f"Companion Host IP: {self.local_ip}")
        logger.info(f"Poll Interval:     {self.poll_interval} sec")
        logger.info("=========================================================")

        self.connect_mavlink()

        try:
            while True:
                self.read_mavlink_telemetry()
                self.push_telemetry_to_backend()
                time.sleep(self.poll_interval)
        except KeyboardInterrupt:
            logger.info("Shutdown signal received. Disconnecting drone agent...")
            if self.mav_conn:
                try:
                    self.mav_conn.close()
                except Exception:
                    pass
            logger.info("DRISHTI Drone Agent terminated cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DRISHTI Drone Companion Gateway Agent")
    parser.add_argument("--config", default="config.json", help="Path to configuration JSON")
    parser.add_argument("--demo", action="store_true", help="Force simulation bench-test mode")
    parser.add_argument("--url", default=None, help="Override backend API URL")
    parser.add_argument("--api-key", default=None, help="Override drone device API key")
    args = parser.parse_args()

    agent = DrishtiDroneAgent(config_path=args.config, demo_mode=args.demo, api_key=args.api_key)
    if args.url:
        agent.backend_url = args.url

    agent.run()
