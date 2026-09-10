# DRISHTI: Frontend Integration Proposal & Permission Requests

In strict compliance with the **READ-ONLY rule for existing files**, zero existing React files have been altered. All new capabilities are safely housed in `cv_module/`, `decision_engine/`, `matlab/`, `integration/`, `docs/`, and `tests/`.

If you wish to visually expose the new Computer Vision stream and Explainable Decision Engine directly inside the existing React UI in the future, the following modifications are proposed for your explicit permission:

---

### Proposed Modification 1: `src/pages/Dashboard.jsx`
- **Current State:** Renders emergency telemetry, fleet status, mission overview, decision-support recommendation, alerts, and analytics.
- **Proposed Addition:** Add a "Live Drone Camera & YOLO Detections" card displaying bounding box overlays and person confidence badges when a drone camera event is detected.
- **Status:** **WAITING FOR PERMISSION. FILE UNTOUCHED.**

---

### Proposed Modification 2: `src/components/LiveMap.jsx`
- **Current State:** Renders Leaflet markers for drones, victims, routes, and blockages.
- **Proposed Addition:** Add visual camera field-of-view (FOV) cones representing where each drone's camera is pointed on the map grid.
- **Status:** **WAITING FOR PERMISSION. FILE UNTOUCHED.**

---

### Proposed Modification 3: `src/pages/VictimsPage.jsx`
- **Current State:** Lists casualty IDs, priority tags, and coordinates.
- **Proposed Addition:** Add a column for "Detection Image & Confidence" showing the YOLO bounding box thumbnail and source drone ID (`DRONE-02`).
- **Status:** **WAITING FOR PERMISSION. FILE UNTOUCHED.**

---

### Current Operational Alternative (Zero Changes Required):
Without modifying any frontend files, the backend (`backend/server.js`) and `integration/data_adapter.js` already feed CV-detected casualties and decision support recommendations directly into the existing WebSocket stream and `public/data/rescue_results.json`. The existing dashboard automatically renders them!
