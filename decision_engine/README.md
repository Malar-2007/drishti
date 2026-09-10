# DRISHTI: Explainable Decision Engine

## Overview
The Decision Engine is the central brain of DRISHTI. It converts raw detections and drone telemetry into actionable, explainable emergency decisions.

### Submodules
1. **`priority_engine.py`**:
   - Calculates urgency score ($0 - 100$) based on:
     - Detection confidence ($w = 0.25$)
     - Hazard zone proximity ($w = 0.35$)
     - Group cluster density ($w = 0.20$)
     - Isolation distance ($w = 0.20$)
   - Classifies casualties as `HIGH`, `MEDIUM`, or `LOW`.
   - Generates human-readable explanation strings.
2. **`drone_assignment.py`**:
   - Multi-criteria battery-aware optimization:
     $$\text{Score} = 0.45\cdot\text{Dist} + 0.25\cdot\text{Bat} + 0.15\cdot\text{Speed} + 0.15\cdot\text{Avail}$$
   - Strict Battery Safety Constraint: If battery $\le 15\%$, drone is disqualified from mission assignment.
   - Calculates $\text{ETA} = \text{distance} / \text{speed}$.
3. **`mission_manager.py`**:
   - Manages triage ordering and tracks 10 mission lifecycle states (`SEARCHING` to `COMPLETED`).
4. **`route_optimizer.py`**:
   - Computes Shortest, Fastest, and Alternative ground corridors.
   - Handles dynamic debris/road blockage rerouting.
5. **`decision_pipeline.py`**:
   - Unified orchestrator combining all submodules into the standardized DRISHTI JSON schema.
