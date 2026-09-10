# DRISHTI: SIH Judge Presentation & Demonstration Script

## 1. Opening Pitch (30 seconds)
> *"Respected jury members, in disaster response, minutes mean lives. DRISHTI is an AI-powered multi-drone decision-support platform that unites aerial computer vision, explainable multi-criteria dispatch, and real-time WebSocket telemetry to dramatically reduce casualty response times."*

---

## 2. 18-Step Live Demonstration Walkthrough

| Step | Action | Expected Output |
|---|---|---|
| **1** | Start MATLAB simulation | 5 drones initialize raster search over Sector Alpha. |
| **2** | Show Live Map on React | Drones visible on Leaflet map moving dynamically. |
| **3** | Aerial camera feed captured | Drone DRONE-02 records disaster sector. |
| **4** | Run OpenCV frame extractor | Keyframes extracted without streaming flood. |
| **5** | YOLOv8 person detector runs | Bounding box identified with confidence score. |
| **6** | Detection JSON generated | Candidate casualty record created with coordinates. |
| **7** | Decision Engine evaluates urgency | Priority calculated as HIGH based on hazard zone & confidence. |
| **8** | Explainable reasons logged | Reasons visible: *"High-confidence detection + active hazard perimeter"*. |
| **9** | Multi-criteria drone evaluation | DRONE-02 scores highest due to lowest ETA and sufficient battery. |
| **10** | Assignment dispatched | Mission M-001 created; DRONE-02 turns towards victim. |
| **11** | Intercept vector drawn | Dashed flight polyline connects drone and victim on map. |
| **12** | Ground rescue route computed | Fastest corridor (blue vector) plotted from base. |
| **13** | Road blockage injected | Obstacle marker (⛔) appears at Sector Bravo. |
| **14** | Alternative route recalculated | Detour perimeter corridor (orange vector) activates instantly. |
| **15** | Instant alert generated | Red alert appears in AlertsPanel without page refresh. |
| **16** | WebSocket broadcast test | Sub-second telemetry update demonstrated. |
| **17** | Fallback test | Disconnect WebSocket; dashboard transitions to yellow JSON polling mode seamlessly. |
| **18** | Victim extricated | Status updates to RESCUED; analytics counters reconcile. |
