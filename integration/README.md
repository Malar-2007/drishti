# DRISHTI Integration Layer

## Purpose
This layer acts as an adapter and bridge between the new backend services, computer vision detections, Decision Engine, and the existing React dashboard without modifying any existing frontend files.

## Modules
1. **`data_adapter.js`**: Validates, normalizes, and sanitizes telemetry payloads across all data channels.
2. **`cv_bridge.js`**: Relays detections from OpenCV/YOLO to `http://localhost:5000/api/simulation-data`, triggering immediate WebSocket broadcasts.
