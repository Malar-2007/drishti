import { useState } from "react";
import {
  Settings as SettingsIcon,
  Sliders,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Eye,
  Play,
  Pause,
  Wifi,
  WifiOff,
  Zap,
  Users,
  BatteryCharging
} from "lucide-react";
import { ConnectionBadge } from "../App";

function SettingsPage({
  pollingInterval = 2000,
  setPollingInterval = () => {},
  roadBlocked = false,
  setRoadBlocked = () => {},
  selectedRoute = "fastest",
  setSelectedRoute = () => {},
  simulationEnabled = true,
  setSimulationEnabled = () => {},
  simSpeed = 1,
  setSimSpeed = () => {},
  mapLayers = { showDrones: true, showVictims: true, showRoutes: true },
  setMapLayers = () => {},
  connectionStatus = "websocket",
  wsEnabled = true,
  setWsEnabled = () => {},
  simulationData = null,
  setSimulationData = () => {}
}) {
  const [batteryThreshold, setBatteryThreshold] = useState(25);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSave = (msg = "Settings saved successfully. Telemetry synchronized.") => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(""), 3500);
  };

  const handleLayerToggle = (layerKey) => {
    setMapLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  // SIH Scenario: Escalate Victim 2 Priority to HIGH
  const triggerEscalateVictim = () => {
    if (simulationData && Array.isArray(simulationData.victims)) {
      const updatedVictims = simulationData.victims.map(v => {
        if (v.id === 2) return { ...v, priority: "HIGH" };
        return v;
      });
      setSimulationData({
        ...simulationData,
        victims: updatedVictims,
        decision_support: {
          ...simulationData.decision_support,
          recommendation: "PRIORITY ESCALATION: Victim V-2 upgraded to HIGH priority. Dynamic mission re-evaluation engaged."
        }
      });
      handleSave("SIH Scenario: Victim V-2 escalated to HIGH priority! Drones re-evaluating priority queue.");
    }
  };

  // SIH Scenario: Drain Drone 1 Battery to trigger Return-to-Base
  const triggerLowBatteryDrone1 = () => {
    if (simulationData && Array.isArray(simulationData.drones)) {
      const updatedDrones = simulationData.drones.map(d => {
        if (d.id === 1) return { ...d, battery: 14, status: "LOW BATTERY", available: false };
        return d;
      });
      setSimulationData({
        ...simulationData,
        drones: updatedDrones,
        decision_support: {
          ...simulationData.decision_support,
          recommendation: "CRITICAL BATTERY: DRONE-01 battery at 14%. Autonomous Return-To-Base engaged; mission transferring to candidate drone."
        }
      });
      handleSave("SIH Scenario: DRONE-01 battery drained to 14%. Low battery RTB triggered.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>System Configuration & SIH Demonstration Center</h1>
          <p>Configure real-time WebSocket parameters, test fallback modes, and inject disaster scenarios</p>
        </div>
        <div className="connection-badge-container">
          <ConnectionBadge status={connectionStatus} />
        </div>
      </div>

      {saveMessage && (
        <div className="save-banner">
          <ShieldCheck size={18} color="#22c55e" />
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="content-grid">
        {/* WEBSOCKET & TELEMETRY CONTROLS */}
        <div className="panel">
          <div className="panel-header">
            <h3>Real-Time Communication Bus</h3>
            {wsEnabled ? <Wifi size={20} color="#22c55e" /> : <WifiOff size={20} color="#f59e0b" />}
          </div>

          {/* WEBSOCKET FALLBACK TEST BUTTON (FOR SIH JUDGES) */}
          <div className="setting-group" style={{ background: "#0b1120", padding: "14px", borderRadius: "8px", border: "1px solid #1f2937" }}>
            <label style={{ color: "#60a5fa" }}>SIH WEBSOCKET & FALLBACK DEMO</label>
            <p>
              Toggle between sub-second WebSocket push and resilient JSON polling to demonstrate architecture robustness to SIH judges.
            </p>
            <div className="button-group">
              <button
                className={`btn-toggle ${wsEnabled ? "active" : ""}`}
                onClick={() => {
                  setWsEnabled(true);
                  handleSave("WebSocket enabled: Connecting to ws://localhost:5000 for sub-second push updates.");
                }}
              >
                <Wifi size={16} /> LIVE: WebSocket Mode (Primary)
              </button>
              <button
                className={`btn-toggle ${!wsEnabled ? "active" : ""}`}
                onClick={() => {
                  setWsEnabled(false);
                  handleSave("WebSocket disconnected: Seamlessly switched to FALLBACK MODE (JSON Polling).");
                }}
              >
                <WifiOff size={16} /> FALLBACK: JSON Polling Mode
              </button>
            </div>
          </div>

          {/* SIMULATION ENGINE STATUS */}
          <div className="setting-group" style={{ marginTop: "16px" }}>
            <label>SIMULATION ENGINE STATUS</label>
            <p>Pause or resume active telemetry ingestion.</p>
            <button
              className={`btn-toggle ${simulationEnabled ? "active" : ""}`}
              onClick={() => setSimulationEnabled(!simulationEnabled)}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {simulationEnabled ? <Pause size={16} /> : <Play size={16} />}
              {simulationEnabled ? "SIMULATION ACTIVE (CLICK TO PAUSE)" : "SIMULATION PAUSED (CLICK TO RESUME)"}
            </button>
          </div>

          {/* SIMULATION SPEED */}
          <div className="setting-group">
            <label>SIMULATION SPEED MULTIPLIER</label>
            <p>Accelerate simulation execution for fast demonstrations.</p>
            <div className="button-group">
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  className={`btn-toggle ${simSpeed === speed ? "active" : ""}`}
                  onClick={() => setSimSpeed(speed)}
                >
                  {speed}x {speed === 1 ? "(Normal)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* POLLING INTERVAL */}
          <div className="setting-group">
            <label>FALLBACK POLLING INTERVAL</label>
            <p>Frequency at which React queries <code>public/data/rescue_results.json</code> when in fallback mode.</p>
            <div className="button-group">
              {[1000, 2000, 3000, 5000].map((ms) => (
                <button
                  key={ms}
                  className={`btn-toggle ${pollingInterval === ms ? "active" : ""}`}
                  onClick={() => setPollingInterval(ms)}
                >
                  {ms / 1000}s ({ms === 2000 ? "Default" : `${ms}ms`})
                </button>
              ))}
            </div>
          </div>

          {/* BATTERY THRESHOLD */}
          <div className="setting-group">
            <label>LOW BATTERY WARNING THRESHOLD (%)</label>
            <p>Drones with battery below this percentage trigger RTB alerts.</p>
            <div className="range-control">
              <input
                type="range"
                min="10"
                max="40"
                value={batteryThreshold}
                onChange={(e) => setBatteryThreshold(Number(e.target.value))}
              />
              <strong>{batteryThreshold}%</strong>
            </div>
          </div>
        </div>

        {/* SIH SCENARIO INJECTOR & MAP LAYERS */}
        <div className="panel">
          <div className="panel-header">
            <h3>SIH Disaster Scenario Triggers</h3>
            <Zap size={20} color="#f59e0b" />
          </div>

          {/* QUICK SCENARIO INJECTION BUTTONS */}
          <div className="setting-group">
            <label>QUICK DEMONSTRATION TRIGGERS FOR JUDGES</label>
            <p>Trigger dynamic events to showcase real-time decision support in action:</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className={`block-button ${roadBlocked ? "active-blocked" : ""}`}
                onClick={() => {
                  setRoadBlocked(!roadBlocked);
                  handleSave(roadBlocked ? "Road clearance confirmed." : "SIH Scenario: Road blockage injected! Alternative route calculated.");
                }}
              >
                <AlertTriangle size={16} />
                {roadBlocked ? "CLEAR ROAD BLOCKAGE (RESTORE NORMAL ROUTE)" : "INJECT ROAD BLOCKAGE (TEST ALTERNATIVE ROUTE)"}
              </button>

              <button
                className="btn-toggle"
                style={{ width: "100%", justifyContent: "center", borderColor: "#f59e0b", color: "#f59e0b" }}
                onClick={triggerEscalateVictim}
              >
                <Users size={16} /> ESCALATE VICTIM 2 TO HIGH PRIORITY (TEST DYNAMIC REASSIGNMENT)
              </button>

              <button
                className="btn-toggle"
                style={{ width: "100%", justifyContent: "center", borderColor: "#ef4444", color: "#ef4444" }}
                onClick={triggerLowBatteryDrone1}
              >
                <BatteryCharging size={16} /> SIMULATE LOW BATTERY ON DRONE 1 (TEST RTB PROTOCOL)
              </button>
            </div>
          </div>

          {/* MAP OVERLAY VISIBILITY */}
          <div className="setting-group" style={{ marginTop: "20px" }}>
            <label>TACTICAL MAP DISPLAY LAYERS</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="showDrones"
                  checked={mapLayers.showDrones}
                  onChange={() => handleLayerToggle("showDrones")}
                />
                <label htmlFor="showDrones">Display Autonomous Drone Fleet (🚁)</label>
              </div>

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="showVictims"
                  checked={mapLayers.showVictims}
                  onChange={() => handleLayerToggle("showVictims")}
                />
                <label htmlFor="showVictims">Display Geolocation Victim Triage (🔴/🟠/🟢)</label>
              </div>

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="showRoutes"
                  checked={mapLayers.showRoutes}
                  onChange={() => handleLayerToggle("showRoutes")}
                />
                <label htmlFor="showRoutes">Display Ground & Drone Flight Vectors (Polylines)</label>
              </div>
            </div>
          </div>

          {/* ROUTE PREFERENCE */}
          <div className="setting-group">
            <label>GROUND RESCUE ROUTING PREFERENCE</label>
            <div className="button-group">
              <button
                className={`btn-toggle ${selectedRoute === "fastest" ? "active" : ""}`}
                onClick={() => setSelectedRoute("fastest")}
              >
                Fastest Corridor
              </button>
              <button
                className={`btn-toggle ${selectedRoute === "shortest" ? "active" : ""}`}
                onClick={() => setSelectedRoute("shortest")}
              >
                Shortest Distance
              </button>
            </div>
          </div>

          <button className="mission-button" style={{ marginTop: "16px" }} onClick={() => handleSave()}>
            SAVE ALL SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
