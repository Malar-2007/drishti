# DRISHTI: Complete System Architecture (SIH)

```
                         DRISHTI
                            │
              ┌─────────────┴─────────────┐
              ↓                           ↓
       MATLAB Simulation          Drone Images / Video
              ↓                           ↓
         Drone State                 OpenCV
              │                           ↓
              │                          YOLO
              │                           ↓
              │                   Person Detection
              │                           ↓
              └─────────────┬─────────────┘
                            ↓
                     Decision Engine
                            ↓
                 Victim Prioritization
                            ↓
              Intelligent Drone Assignment
                            ↓
                         Backend
                            ↓
                       WebSocket
                            ↓
                    React Dashboard
                            ↓
          ┌─────────┬─────────┬──────────┐
          ↓         ↓         ↓          ↓
        Live Map  Alerts   Missions   Analytics
```

## Data Flow Description
1. **Simulation**: MATLAB (`matlab/drishti_master_simulation.m` or `matlab/drishti_simulation.m`) runs dynamic drone flight paths and battery depletion.
2. **Perception**: Drone aerial images or video feeds pass into `cv_module/detector.py`, where OpenCV extracts frames and YOLO detects people candidates.
3. **Decision Support**: `decision_engine/` evaluates triage urgency (`HIGH`, `MEDIUM`, `LOW`), sorts casualty queue, applies battery cutoff constraints ($\le 15\%$), and assigns the optimal drone.
4. **Distribution**: Backend (`backend/server.js`) ingests simulation data and broadcasts it over WebSocket (`ws://localhost:5000`) and writes atomically to `public/data/rescue_results.json`.
5. **Presentation**: React command dashboard renders real-time updates seamlessly on Live Map, Alerts Panel, Missions Dispatch, and Analytics.
