import { useState } from "react";
import {
  Plane,
  Battery,
  Radio,
  Gauge,
  Compass,
  MapPin,
  Target,
  ShieldCheck,
  AlertTriangle,
  Cpu
} from "lucide-react";
import ConnectDronePanel from "../components/ConnectDronePanel";

function DronesPage({ drones = [], rescue = {}, simulationData = {} }) {
  const [selectedDroneId, setSelectedDroneId] = useState(drones[0]?.id || 1);
  const [activeView, setActiveView] = useState("fleet"); // 'fleet' | 'gateway'

  const selectedDrone = drones.find((d) => d.id === selectedDroneId) || drones[0] || {};
  const isAssigned = selectedDrone.id === rescue.assigned_drone;

  // Calculate distance if assigned
  const assignedVictim = isAssigned ? `V-${rescue.target_victim}` : "None";
  const distanceToVictim = isAssigned && rescue.distance ? `${Number(rescue.distance).toFixed(1)} m` : "N/A";

  const getBatteryColorClass = (level) => {
    if (level > 40) return "battery-good";
    if (level >= 20) return "battery-warning";
    return "battery-critical";
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case "ASSIGNED":
      case "RESCUING":
        return "badge-assigned";
      case "LOW BATTERY":
        return "badge-critical";
      case "SEARCHING":
      case "AVAILABLE":
        return "badge-searching";
      default:
        return "badge-default";
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Drone Fleet Operations</h1>
          <p>Real-time telemetry, battery health, and autonomous search operations</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* VIEW SWITCHER: VIRTUAL FLEET vs HARDWARE GATEWAY */}
          <div style={{ display: "flex", alignItems: "center", background: "#0b1120", padding: "3px", borderRadius: "8px", border: "1px solid #1f2937" }}>
            <button
              onClick={() => setActiveView("fleet")}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: activeView === "fleet" ? "#2563eb" : "transparent",
                color: activeView === "fleet" ? "#ffffff" : "#94a3b8",
                transition: "all 0.2s ease"
              }}
            >
              VIRTUAL FLEET (MATLAB)
            </button>
            <button
              onClick={() => setActiveView("gateway")}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: activeView === "gateway" ? "#059669" : "transparent",
                color: activeView === "gateway" ? "#ffffff" : "#94a3b8",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Radio size={14} />
              HARDWARE GATEWAY (JETSON)
            </button>
          </div>

          <div className="live-status">
            <span></span> FLEET ACTIVE ({drones.length} UNITS)
          </div>
        </div>
      </div>

      {activeView === "gateway" ? (
        <ConnectDronePanel />
      ) : (
        <>
          {/* DRONE OVERVIEW STATS */}
          <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Plane />
          </div>
          <div>
            <p>Total Fleet</p>
            <h2>{drones.length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Radio />
          </div>
          <div>
            <p>Online & Searching</p>
            <h2>{drones.filter((d) => d.available && d.status !== "LOW BATTERY").length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Target />
          </div>
          <div>
            <p>Assigned to Mission</p>
            <h2>{drones.filter((d) => d.status === "ASSIGNED" || d.status === "RESCUING").length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <AlertTriangle />
          </div>
          <div>
            <p>Low Battery (&lt;25%)</p>
            <h2>{drones.filter((d) => d.battery < 25).length}</h2>
          </div>
        </div>
      </div>

      {/* DRONES CONTENT GRID: LIST + DETAILS INSPECTOR */}
      <div className="content-grid">
        {/* DRONE LIST */}
        <div className="panel">
          <div className="panel-header">
            <h3>Autonomous Fleet Units</h3>
            <span>Select a unit to inspect telemetry</span>
          </div>

          <div className="drone-list">
            {drones.map((drone) => {
              const isSelected = drone.id === selectedDrone.id;
              const isDroneAssigned = drone.id === rescue.assigned_drone;
              const statusText = drone.status || (drone.available ? "SEARCHING" : "OFFLINE");

              return (
                <div
                  key={drone.id}
                  className={`drone-row ${isSelected ? "selected-row" : ""}`}
                  onClick={() => setSelectedDroneId(drone.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="drone-name">
                    <div className="drone-avatar" style={{ background: isSelected ? "#ef4444" : "#1e293b" }}>
                      <Plane size={18} color="white" />
                    </div>
                    <div>
                      <strong>DRONE-{String(drone.id).padStart(2, "0")}</strong>
                      <span className={`status-pill ${getStatusBadgeClass(statusText)}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>

                  <div className={`battery ${getBatteryColorClass(drone.battery)}`}>
                    <Battery size={16} />
                    <strong>{drone.battery}%</strong>
                  </div>

                  <div className="signal">
                    <Radio size={16} />
                    {drone.speed} m/s
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETAILED TELEMETRY INSPECTOR */}
        <div className="panel telemetry-panel">
          <div className="panel-header">
            <h3>Telemetry Inspector: DRONE-{String(selectedDrone.id).padStart(2, "0")}</h3>
            <span className={`status-pill ${getStatusBadgeClass(selectedDrone.status)}`}>
              {selectedDrone.status || (selectedDrone.available ? "SEARCHING" : "OFFLINE")}
            </span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <div className="telemetry-icon"><Battery size={20} /></div>
              <div>
                <label>Battery Level</label>
                <strong>{selectedDrone.battery}%</strong>
                <div className="battery-bar-container">
                  <div
                    className={`battery-bar-fill ${getBatteryColorClass(selectedDrone.battery)}`}
                    style={{ width: `${Math.min(100, Math.max(0, selectedDrone.battery))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon"><Gauge size={20} /></div>
              <div>
                <label>Flight Speed</label>
                <strong>{selectedDrone.speed} m/s</strong>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon"><Compass size={20} /></div>
              <div>
                <label>Flight Altitude</label>
                <strong>{selectedDrone.altitude} m</strong>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon"><MapPin size={20} /></div>
              <div>
                <label>GPS Coordinates (X, Y)</label>
                <strong>({selectedDrone.x}, {selectedDrone.y})</strong>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon"><Target size={20} /></div>
              <div>
                <label>Assigned Victim</label>
                <strong>{assignedVictim}</strong>
              </div>
            </div>

            <div className="telemetry-item">
              <div className="telemetry-icon"><ShieldCheck size={20} /></div>
              <div>
                <label>Distance to Target</label>
                <strong>{distanceToVictim}</strong>
              </div>
            </div>
          </div>

          {/* SENSOR PAYLOAD & DIAGNOSTICS */}
          <div style={{ marginTop: "16px", padding: "12px", background: "#0b1120", borderRadius: "8px", border: "1px solid #1f2937" }}>
            <h4 style={{ fontSize: "12px", color: "#9ca3af", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>
              Avionics & Sensor Payload Health
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827", padding: "8px 10px", borderRadius: "6px" }}>
                <span style={{ color: "#9ca3af" }}>Thermal FLIR Sensor:</span>
                <strong style={{ color: "#22c55e" }}>NOMINAL (38.4°C)</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827", padding: "8px 10px", borderRadius: "6px" }}>
                <span style={{ color: "#9ca3af" }}>4K Optical Zoom:</span>
                <strong style={{ color: "#22c55e" }}>LOCKED (30 FPS)</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827", padding: "8px 10px", borderRadius: "6px" }}>
                <span style={{ color: "#9ca3af" }}>LIDAR Obstacle Avoid:</span>
                <strong style={{ color: "#22c55e" }}>ACTIVE (360°)</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827", padding: "8px 10px", borderRadius: "6px" }}>
                <span style={{ color: "#9ca3af" }}>RF Telemetry Link:</span>
                <strong style={{ color: selectedDrone.available ? "#22c55e" : "#ef4444" }}>
                  {selectedDrone.available ? "99.8% (5.8 GHz)" : "OFFLINE"}
                </strong>
              </div>
            </div>
          </div>

          <div className="ai-box" style={{ marginTop: "16px" }}>
            <h4>Decision Support Telemetry Note</h4>
            <p>
              {isAssigned
                ? `Drone-${String(selectedDrone.id).padStart(2, "0")} is actively designated for immediate rescue operations based on optimal Euclidean distance and battery reserve.`
                : `Drone-${String(selectedDrone.id).padStart(2, "0")} is maintaining an active raster search pattern over Sector Alpha with nominal sensor payload telemetry.`}
            </p>
          </div>
        </div>
      </div>
    </>
  )}
</div>
);
}

export default DronesPage;
