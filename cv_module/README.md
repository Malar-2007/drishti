# DRISHTI: Computer Vision & YOLO Person Detection Module

## Overview
This module processes live and recorded drone camera imagery to detect stranded people in disaster zones using **OpenCV** and **YOLOv8** (`ultralytics`).

### Ethical & Technical Principle
- **YOLO's Role:** Identifies visual patterns belonging to the `person` class.
- **What YOLO Does NOT Do:** It does NOT diagnose or invent medical conditions (e.g., "unconscious", "critically injured", "bleeding").
- **Triage Protocol:** Detected candidates are handed off to the separate **Explainable Decision Engine** to calculate rescue urgency.

---

## Output Schema
```json
{
  "status": "success",
  "source_drone": 2,
  "drone_position": { "x": 650.0, "y": 750.0 },
  "person_count": 2,
  "detections": [
    {
      "detection_id": "DET-D02-01",
      "class": "person",
      "confidence": 0.934,
      "bbox": [140.5, 210.0, 230.2, 415.8],
      "estimated_coords": { "x": 634.8, "y": 762.4 },
      "source_drone": 2,
      "timestamp": "2026-09-10 11:45:00"
    }
  ],
  "inference_time_ms": 38.2,
  "model_used": "yolov8n.pt"
}
```

---

## Quick Start
```bash
# 1. Install dependencies
pip install -r cv_module/requirements.txt

# 2. Run automated test
python cv_module/test_cv.py

# 3. Process an image directly
python cv_module/detector.py
```
