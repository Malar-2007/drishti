# DRISHTI: AI-Powered Multi-Drone Search & Rescue Decision Support Platform
> **Smart India Hackathon (SIH) Project**  
> *Autonomous Aerial Reconnaissance, Multi-Criteria Drone Allocation, Real-Time WebSocket Telemetry, and Dynamic Ground Route Optimization*

---

## 1. Executive Summary & Pitch
> *"DRISHTI is a real-time AI-assisted multi-drone disaster response decision-support platform. MATLAB simulates the disaster environment and drone fleet. The backend distributes live simulation data through WebSocket, allowing the React command dashboard to receive drone, victim, mission, route, and alert updates instantly. A JSON polling mechanism provides resilience when the real-time connection is unavailable."*

During disaster events (floods, earthquakes, landslides), first responders face severe time constraints, communication cutoffs, and rapidly changing road blockages. DRISHTI solves this by orchestrating a fleet of autonomous UAVs to:
$$\text{Detect} \longrightarrow \text{Analyze} \longrightarrow \text{Prioritize} \longrightarrow \text{Assign} \longrightarrow \text{Route} \longrightarrow \text{Rescue} \longrightarrow \text{Monitor}$$

---

## 2. SIH Problem Relevance
In conventional disaster scenarios:
- Ground teams lack situational awareness and waste critical hours traversing damaged or blocked corridors.
- Drones deployed without coordinated multi-criteria dispatch duplicate search areas and suffer premature battery exhaustion.
- Traditional static dashboards fail if central cloud connectivity drops.

**DRISHTI delivers:**
1. **Intelligent Multi-Criteria UAV Dispatch:** Automatically matches victims to the optimal drone based on Euclidean distance, battery health, flight speed, and availability.
2. **Sub-Second Real-Time Telemetry:** Live WebSocket stream pushes position updates, battery depletion, and distress triggers to the incident command center without browser refreshes.
3. **Fail-Safe Offline Continuity:** Zero-crash dual-mode architecture that seamlessly transitions to local JSON polling if network links degrade.
4. **Dynamic Ground Obstacle Rerouting:** Automatically detects road obstructions and recalculates perimeter detour corridors for ground rescue ambulances.

---

## 3. End-to-End System Architecture

```
                    ┌───────────────────────────────┐
                    │       MATLAB SIMULATION       │
                    │   (matlab/drishti_simulation) │
                    └───────────────┬───────────────┘
                                    │ Kinematics, Battery, AI Scoring
                    ┌───────────────┴───────────────┐
                    │                               │
        POST /api/simulation-data        Atomic File Persistence
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────────┐   ┌───────────────────────────────┐
    │     DRISHTI BACKEND SERVER    │   │      JSON BACKUP STORE        │
    │      (backend/server.js)      │   │  (public/data/rescue_results) │
    │     Express + WS (Port 5000)  │   └───────────────┬───────────────┘
    └───────────────┬───────────────┘                   │
                    │                                   │
          Primary WebSocket Push                 Fallback Polling
          (Sub-second updates)                   (Cache-busted HTTP)
                    │                                   │
                    ▼                                   ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │                    REACT COMMAND DASHBOARD                        │
    │       (Vite 8 + React 19 + Leaflet + Recharts + Lucide)           │
    └───────┬───────────────┬───────────────┬───────────────┬───────────┘
            │               │               │               │
            ▼               ▼               ▼               ▼
      [ Live Map ]    [ Alerts Panel ] [ Analytics ]   [ Mission Dispatch ]
```

---

## 4. Technology Stack

| Layer | Technologies | Role / Description |
|---|---|---|
| **Frontend UI** | React 19, Vite 8, CSS3 | Tactical Incident Command Dashboard |
| **Mapping & Geospatial** | Leaflet 1.9, React-Leaflet 5.0 | Geolocation tracking of drones, victims, routes, and blockages |
| **Data Analytics** | Recharts 3.10 | Real-time fleet power reserves and casualty triage charts |
| **Icons & Design** | Lucide React | Clean, high-contrast disaster operations interface |
| **Backend API** | Node.js, Express 5, `ws` 8, CORS | Dual REST & WebSocket broadcaster on port 5000 |
| **Simulation Engines** | MATLAB (R2020b+) / Node.js Engine | Continuous UAV flight dynamics, sensor triage, road blockage |
| **Storage & Fail-Safe** | Atomic JSON (`fs.renameSync`) | Resilient, corruption-proof on-disk fallback store |

---

## 5. Intelligent Multi-Criteria Decision Algorithm
*(Accurately described as an **Intelligent Decision Algorithm**, avoiding false claims of a black-box deep learning model).*

For every detected victim, candidate UAVs are evaluated using a normalized multi-criteria objective function:

$$\text{Score}_i = w_{\text{dist}} \cdot f_{\text{dist}}(d_i) + w_{\text{battery}} \cdot f_{\text{battery}}(b_i) + w_{\text{speed}} \cdot f_{\text{speed}}(s_i) + w_{\text{avail}} \cdot f_{\text{avail}}(a_i)$$

Where:
- **Distance Factor ($w_{\text{dist}} = 0.45$):**  
  $$f_{\text{dist}}(d_i) = \max\left(0, 1 - \frac{\text{Distance to Victim}}{3000\,\text{m}}\right)$$
- **Battery Factor ($w_{\text{battery}} = 0.25$):**  
  $$f_{\text{battery}}(b_i) = \frac{\text{Battery Percentage}}{100}$$
- **Speed Factor ($w_{\text{speed}} = 0.15$):**  
  $$f_{\text{speed}}(s_i) = \frac{\text{Flight Speed}}{15\,\text{m/s}}$$
- **Availability Factor ($w_{\text{avail}} = 0.15$):**  
  $$f_{\text{avail}}(a_i) = \begin{cases} 1 & \text{if } a_i = \text{true and } b_i > 25\% \\ 0 & \text{otherwise} \end{cases}$$

### Failsafe Safety Constraints:
- If a drone's battery drops to $\le 15\%$, its score is penalized by $95\%$ ($\text{Score} \times 0.05$), its availability flag is cleared, and an **Autonomous Return-To-Base (RTB)** protocol is engaged.
- **Explainable Decision Rationale:** Every assignment outputs a human-readable justification displayed directly on the dashboard (e.g., *"DRONE-02 selected for V-1: HIGH priority + est. response time 21s + battery 61.2% (AI Score: 0.83)"*).

---

## 6. Dynamic Route Optimization & Hazard Clearance
Ground Rescue Team 01 navigates between the Base Station $(500, 500)$ and the target incident site using multi-corridor evaluation:
1. **Shortest Route:** Direct linear path minimizing total distance traveled.
2. **Fastest Route (Default):** Arterial corridor utilizing high-speed roadways.
3. **Alternative Route:** Automated perimeter bypass activated immediately when an obstruction (collapsed structure, fallen tree, or flood debris) is reported.

---

## 7. Installation & Quick Start Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- MATLAB (Optional: companion Node simulator included for standalone operation)
- Modern web browser (Chrome, Edge, Firefox)

### Step 1: Clone & Verify Dependencies
```bash
cd "C:\Users\Mary Sugandha Malar\OneDrive\Desktop\Drishti\drishti"

# Verify installed packages
npm list --depth=0
```

### Step 2: Start the Backend Server
```bash
npm run server
```
*Output: DRISHTI Backend active on `http://localhost:5000`, WebSocket on `ws://localhost:5000`.*

### Step 3: Start the React Dashboard
In a second terminal:
```bash
npm run dev
```
*Open your browser at `http://localhost:5173`.*

### Step 4: Run the Disaster Simulation Engine

#### Option A: Running in MATLAB (Native)
1. Open MATLAB and navigate to the project directory:
   ```matlab
   cd 'C:\Users\Mary Sugandha Malar\OneDrive\Desktop\Drishti\drishti\matlab'
   ```
2. Start the continuous simulation:
   ```matlab
   drishti_simulation
   ```

#### Option B: Running the Companion Simulator (No MATLAB required)
In a third terminal:
```bash
npm run simulate
```

---

## 8. SIH Demonstration Walkthrough (12 Steps)

DRISHTI includes a dedicated **SIH JUDGE DEMO MODE** directly accessible via the button at the top of the Emergency Dashboard. You can demonstrate the entire disaster response lifecycle step-by-step:

| Step | Phase | What Happens & What Judges See |
|---|---|---|
| **01** | **Fleet Reconnaissance** | 5 UAVs patrol sector grid in synchronized search patterns. |
| **02** | **Victim Geolocation** | Thermal IR signature identifies Victim V-1 at coordinates (650, 750). |
| **03** | **Triage Prioritization** | Victim classified as **HIGH PRIORITY** (red marker), preempting routine sweeps. |
| **04** | **Intelligent AI Scoring** | Multi-criteria formula scores all drones in real time. |
| **05** | **Optimal UAV Allocation** | Best candidate (DRONE-02) assigned with explainable rationale displayed. |
| **06** | **Autonomous Intercept** | Drone turns towards target; dashed flight line updates live on map. |
| **07** | **Ground Corridor Routing** | Fastest route (blue vector) plotted from Rescue Base to victim site. |
| **08** | **Hazard Detection** | Road blockage injected at Sector Bravo; road alert turns RED. |
| **09** | **Dynamic Corridor Reroute** | Alternative perimeter route (orange dashed line) engages automatically. |
| **10** | **Instant WebSocket Push** | Telemetry and alerts update instantly with zero page reloads. |
| **11** | **Casualty Extrication** | Victim status transitions to RESCUED; site secured by ground unit. |
| **12** | **Analytics Reconciliation** | Rescued counter increments; battery distribution charts refresh. |

---

## 9. Testing & Verification Checklist

Run the automated verification suite to validate all 16 mission-critical system checks:

```bash
node scripts/test_suite.js
```

### Verification Checklist:
- [x] **Test 01:** JSON output file exists in `public/data/rescue_results.json`.
- [x] **Test 02:** File contains valid, well-formed JSON.
- [x] **Test 03:** Drones array contains 5 active units.
- [x] **Test 04:** Drone objects contain complete telemetry properties.
- [x] **Test 05:** Victims array contains HIGH, MEDIUM, and LOW priority triage.
- [x] **Test 06:** Backward-compatible `rescue` assignment object is maintained.
- [x] **Test 07:** AI decision-support metadata provides explainable recommendation.
- [x] **Test 08:** Mission lifecycle state tracking (`M-001`).
- [x] **Test 09:** Ground routes include Shortest, Fastest, and Alternative corridors.
- [x] **Test 10:** Emergency alerts arrive dynamically with severity levels.
- [x] **Test 11:** Battery threshold constraint ($\le 15\%$) triggers RTB unavailable state.
- [x] **Test 12:** Multi-criteria algorithm scores closer drones higher.
- [x] **Test 13:** Higher battery drones receive higher assignment priority.
- [x] **Test 14:** Road blockage successfully triggers alternative detour path.
- [x] **Test 15:** Analytics report total rescued victims and fleet statistics.
- [x] **Test 16:** All core frontend, backend, and MATLAB scripts exist and build cleanly.

---

## 10. Fail-Safe Dual-Mode Communication

```
  WebSocket Active ──(Disconnect)──> Fallback Polling ──(Reconnect)──> WebSocket Active
 [● LIVE TELEMETRY]                 [● FALLBACK MODE]                 [● LIVE TELEMETRY]
```

To demonstrate system resilience to judges:
1. Observe the green **`LIVE – WebSocket Connected`** badge.
2. In **Settings**, toggle to **FALLBACK: JSON Polling Mode** (or terminate the backend).
3. The badge seamlessly transitions to yellow **`FALLBACK MODE – JSON Polling`**.
4. The dashboard continues rendering live telemetry from `rescue_results.json` without crashing or refreshing the page.
5. Re-enable WebSocket to watch the system seamlessly upgrade back to live sub-second push.
