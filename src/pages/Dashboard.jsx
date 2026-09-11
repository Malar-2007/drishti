import { useEffect, useState } from "react";

import {
  Plane,
  Users,
  Target,
  AlertTriangle,
  Battery,
  Radio,
  Award,
  Compass,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  Play,
  ChevronDown,
  ChevronUp,
  FastForward,
  RotateCcw,
  Sparkles
} from "lucide-react";

import LiveMap from "../components/LiveMap";
import RoutePlanner from "../components/RoutePlanner";
import AlertsPanel from "../components/AlertsPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import YoloDetectionCard from "../components/YoloDetectionCard";
import VictimIntelligenceCard from "../components/VictimIntelligenceCard";
import EventFeed from "../components/EventFeed";
import ConnectDronePanel from "../components/ConnectDronePanel";
import { ConnectionBadge } from "../App";

import { getSimulationData } from "../data/simulationAPI";

function Dashboard({
  setActiveTab = () => {},
  mapLayers = { showDrones: true, showVictims: true, showRoutes: true },
  simulationData: propSimulationData = null,
  connectionStatus = "websocket"
}) {
  const [operationMode, setOperationMode] = useState("simulation"); // 'simulation' | 'real_drone'
  const [realDroneTelemetry, setRealDroneTelemetry] = useState(null);
  const [internalData, setInternalData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState("fastest");
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [currentDemoStep, setCurrentDemoStep] = useState(1);

  // Use props data from App.jsx if available, else load internally
  useEffect(() => {
    if (propSimulationData) {
      setInternalData(propSimulationData);
      if (typeof propSimulationData.road_blocked === "boolean") {
        setRoadBlocked(propSimulationData.road_blocked);
      }
    } else {
      const loadSimulationData = async () => {
        try {
          const data = await getSimulationData();
          setInternalData(data);
          if (data && typeof data.road_blocked === "boolean") {
            setRoadBlocked(data.road_blocked);
          }
        } catch (error) {
          console.error("MATLAB data loading error:", error);
        }
      };

      loadSimulationData();
      const interval = setInterval(loadSimulationData, 2000);
      return () => clearInterval(interval);
    }
  }, [propSimulationData]);

  const fallbackData = {
    drones: [
      { id: 1, name: "DRONE-01", x: 700, y: 700, altitude: 100, speed: 10, battery: 90, available: true, status: "SEARCHING" },
      { id: 2, name: "DRONE-02", x: -420, y: 1120, altitude: 100, speed: 12, battery: 85, available: true, status: "SEARCHING" },
      { id: 3, name: "DRONE-03", x: 1160, y: -460, altitude: 100, speed: 11, battery: 80, available: true, status: "SEARCHING" },
      { id: 4, name: "DRONE-04", x: 100, y: 0, altitude: 100, speed: 10, battery: 95, available: true, status: "SEARCHING" },
      { id: 5, name: "DRONE-05", x: 980, y: 1480, altitude: 100, speed: 13, battery: 75, available: true, status: "SEARCHING" }
    ],
    victims: [
      { id: 1, name: "V-1", x: 650, y: 750, priority: "HIGH", status: "ASSIGNED", assignedDrone: 1 },
      { id: 2, name: "V-2", x: 250, y: 450, priority: "MEDIUM", status: "DETECTED", assignedDrone: 0 },
      { id: 3, name: "V-3", x: 800, y: 250, priority: "LOW", status: "DETECTED", assignedDrone: 0 }
    ],
    rescue: { target_victim: 1, priority: "HIGH", assigned_drone: 1, distance: 70.7, battery: 90 },
    decision_support: {
      selected_drone_id: 1,
      recommendation: "DRONE-01 selected for V-1: HIGH priority + shortest response time + sufficient battery reserve.",
      estimated_arrival_sec: 7,
      road_blocked: false,
      selected_ground_route: "fastest"
    },
    mission: { id: "M-001", status: "ASSIGNED", targetVictim: 1, assignedDrone: 1, estTime: "7 sec", distance: "70.7 m" },
    routes: { selected: "fastest", road_blocked: false, shortest_distance: "1.8 km", fastest_distance: "2.4 km" },
    alerts: [
      { type: "HIGH", title: "HIGH PRIORITY VICTIM DETECTED", message: "Victim V-1 requires immediate rescue.", time: "Just now" },
      { type: "INFO", title: "DRONE-01 ASSIGNED", message: "DRONE-01 assigned to Victim V-1.", time: "Live" }
    ],
    analytics: { rescued_count: 0, active_missions: 1, avg_response_time: "7 sec", success_rate: "98%" },
    road_blocked: false
  };

  const simulationData = propSimulationData || internalData || fallbackData;

  const baseDrones = Array.isArray(simulationData.drones) ? simulationData.drones : [];
  const drones = operationMode === "real_drone" && realDroneTelemetry
    ? [
        {
          id: 1,
          name: realDroneTelemetry.droneId || "DRONE-01",
          x: 700 + Math.round(((realDroneTelemetry.latitude || 13.0827) - 13.0827) * 20000),
          y: 700 + Math.round(((realDroneTelemetry.longitude || 80.2707) - 80.2707) * 20000),
          altitude: realDroneTelemetry.altitude || 100,
          speed: realDroneTelemetry.speed || 12,
          battery: realDroneTelemetry.battery ?? 78,
          available: true,
          status: realDroneTelemetry.armed ? "ARMED (LIVE)" : "GATEWAY CONNECTED",
          flightMode: realDroneTelemetry.flightMode || "GUIDED",
          isRealHardware: true
        },
        ...baseDrones.slice(1)
      ]
    : baseDrones;

  const victims = Array.isArray(simulationData.victims) ? simulationData.victims : [];

  const rescue = {
    targetVictim: simulationData.rescue?.target_victim || (victims[0]?.id) || 1,
    priority: simulationData.rescue?.priority || (victims[0]?.priority) || "HIGH",
    assignedDrone: simulationData.rescue?.assigned_drone || 1,
    distance: simulationData.rescue?.distance || 70.7,
    battery: simulationData.rescue?.battery || 90
  };

  const activeDrones = drones.filter(
    drone => drone.available
  ).length;

  const highPriorityVictims = victims.filter(
    victim => victim.priority === "HIGH"
  ).length;

  const decision = simulationData.decision_support || {
    recommendation: `DRONE-${String(rescue.assignedDrone).padStart(2, "0")} selected for V-${rescue.targetVictim}: ${rescue.priority} priority + shortest response time + sufficient battery.`,
    estimated_arrival_sec: Math.round(rescue.distance / 10)
  };

  const assignedDroneObj = drones.find(d => d.id === rescue.assignedDrone) || drones[0] || {
    id: rescue.assignedDrone,
    speed: 10,
    battery: rescue.battery,
    available: true,
    status: "ASSIGNED"
  };

  const droneSpeed = assignedDroneObj.speed || 10;
  const droneBattery = assignedDroneObj.battery ?? rescue.battery;
  const droneDistance = Number(rescue.distance || 70.71);
  const etaSeconds = (decision.estimated_arrival_sec != null)
    ? decision.estimated_arrival_sec
    : (simulationData?.mission?.estTime ? parseFloat(simulationData.mission.estTime) : null)
    || Math.round((droneDistance / Math.max(droneSpeed, 1)) * 100) / 100;
  const droneAvailability = (assignedDroneObj.available && droneBattery > 15) ? "AVAILABLE" : "UNAVAILABLE (LOW BATTERY)";

  const assignmentReason = decision.assignment_reason
    || (decision.recommendation && decision.recommendation.toLowerCase().includes("selected")
        ? decision.recommendation
        : `Selected because it is available, has sufficient battery (${droneBattery}%), and provides the lowest safe arrival time (${etaSeconds} sec).`);

  const decisionObj = {
    ...decision,
    recommendation: assignmentReason,
    estimated_arrival_sec: etaSeconds
  };

  const sihDemoSteps = [
    {
      num: 1,
      title: "Drones Begin Searching",
      badge: "FLEET RECONNAISSANCE",
      desc: "5 autonomous UAVs initiate synchronized raster grid sweeps over the disaster sector.",
      hint: "Fleet online: DRONE-01 through DRONE-05 telemetry streaming."
    },
    {
      num: 2,
      title: "Victim Detected",
      badge: "TARGET IDENTIFICATION",
      desc: "Aerial thermal optical sensors register distress signature at coordinates (650, 750).",
      hint: "Victim V-1 detected and geolocated on Live Map."
    },
    {
      num: 3,
      title: "Victim Priority Assigned",
      badge: "TRIAGE PROTOCOL",
      desc: "Victim classified as HIGH priority based on exposure, severity, and urgency triage criteria.",
      hint: "High priority triage preempts routine patrol sweeps."
    },
    {
      num: 4,
      title: "Intelligent AI Scoring",
      badge: "DECISION ALGORITHM",
      desc: "Multi-criteria algorithm computes: Score = 0.45·Dist + 0.25·Bat + 0.15·Speed + 0.15·Avail.",
      hint: "Scores calculated dynamically across all available fleet units."
    },
    {
      num: 5,
      title: "Drone Automatically Assigned",
      badge: "DISPATCH ALLOCATION",
      desc: "DRONE-02 allocated based on lowest arrival ETA and battery reserve sufficiency.",
      hint: "Telemetry link locked onto Target Victim."
    },
    {
      num: 6,
      title: "Drone Moves Toward Victim",
      badge: "AUTONOMOUS FLIGHT",
      desc: "Assigned UAV navigates vector towards target, decrementing distance and arrival ETA.",
      hint: "Live map dashed flight vector displays intercept course."
    },
    {
      num: 7,
      title: "Ground Rescue Route Calculated",
      badge: "ROUTE OPTIMIZATION",
      desc: "Ground Rescue Team 01 initiates primary fastest corridor from Base (500, 500) to site.",
      action: () => { setRoadBlocked(false); setSelectedRoute("fastest"); },
      hint: "Fastest corridor (blue vector) active."
    },
    {
      num: 8,
      title: "Road Blockage Occurs",
      badge: "DISASTER HAZARD",
      desc: "Debris obstruction detected at Sector Bravo. Arterial ground corridor marked blocked.",
      action: () => { setRoadBlocked(true); },
      hint: "Blockage marker (⛔) placed, triggering emergency reroute."
    },
    {
      num: 9,
      title: "Alternative Route Calculated",
      badge: "DYNAMIC RE-ROUTING",
      desc: "Emergency detour algorithm immediately plots perimeter alternative corridor (orange vector).",
      action: () => { setRoadBlocked(true); },
      hint: "Alternative ground rescue path activated."
    },
    {
      num: 10,
      title: "Instant Alerts Broadcasted",
      badge: "WEBSOCKET TELEMETRY",
      desc: "Sub-second WebSocket broadcast delivers critical obstacle and assignment alerts instantly.",
      hint: "Alerts panel updates without any browser page reload."
    },
    {
      num: 11,
      title: "Victim Rescued",
      badge: "MISSION EXTRICATION",
      desc: "Aerial drone maintains visual and sensor lock while ground unit extricates victim.",
      hint: "Victim status transitions to RESCUED."
    },
    {
      num: 12,
      title: "Analytics Updated",
      badge: "MISSION COMPLETION",
      desc: "Fleet performance metrics, rescued counter, and battery stats update across system.",
      hint: "Mission archived with full decision-support audit trail."
    }
  ];

  return (
    <div className="dashboard">

      {/* SYSTEM WARNING BANNERS FOR EDGE CASES */}
      {activeDrones === 0 && drones.length > 0 && (
        <div className="save-banner" style={{ background: "rgba(239, 68, 68, 0.2)", borderColor: "#ef4444", color: "#f87171" }}>
          <ShieldAlert size={20} color="#ef4444" />
          <span><strong>ALERT:</strong> All drones currently unavailable or critically depleted. Autonomous Return-To-Base (RTB) engaged.</span>
        </div>
      )}

      {victims.length === 0 && (
        <div className="save-banner" style={{ background: "rgba(34, 197, 94, 0.15)", borderColor: "#22c55e", color: "#22c55e" }}>
          <CheckCircle2 size={20} color="#22c55e" />
          <span><strong>SECTOR CLEAR:</strong> No active victims detected in designated grid. Drones maintaining reconnaissance sweep.</span>
        </div>
      )}

      {/* PAGE HEADER WITH DYNAMIC SIH CONNECTION BADGE & MODE SELECTOR */}
      <div className="page-header">
        <div>
          <h1>Emergency Dashboard</h1>
          <p>
            AI-powered multi-drone search and rescue monitoring
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* OPERATION MODE SELECTOR (SIMULATION vs REAL DRONE) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#0b1120",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid #1f2937"
            }}
          >
            <button
              onClick={() => setOperationMode("simulation")}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: operationMode === "simulation" ? "#2563eb" : "transparent",
                color: operationMode === "simulation" ? "#ffffff" : "#94a3b8",
                transition: "all 0.2s ease"
              }}
            >
              SIMULATION MODE
            </button>
            <button
              onClick={() => setOperationMode("real_drone")}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: operationMode === "real_drone" ? "#059669" : "transparent",
                color: operationMode === "real_drone" ? "#ffffff" : "#94a3b8",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Radio size={14} />
              REAL DRONE MODE
            </button>
          </div>

          <button
            onClick={() => setShowDemoGuide(!showDemoGuide)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: showDemoGuide ? "#3b82f6" : "#1f2937",
              color: "white",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <Sparkles size={16} color={showDemoGuide ? "#ffffff" : "#60a5fa"} />
            <span>SIH JUDGE DEMO MODE</span>
            {showDemoGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <div className="connection-badge-container">
            <ConnectionBadge status={connectionStatus} />
          </div>
        </div>
      </div>

      {operationMode === "real_drone" ? (
        <div className="real-drone-dashboard">
          {/* REAL DRONE GATEWAY PANEL */}
          <div style={{ marginBottom: "24px" }}>
            <ConnectDronePanel
              onTelemetryUpdate={(data) => setRealDroneTelemetry(data)}
            />
          </div>

          {/* EXISTING LIVE MAP */}
          <LiveMap
            drones={drones}
            victims={victims}
            selectedRoute={selectedRoute}
            roadBlocked={roadBlocked}
            assignedDroneId={rescue.assignedDrone}
            targetVictimId={rescue.targetVictim}
            mapLayers={mapLayers}
          />

          {/* EXISTING EVENT FEED & ALERTS */}
          <div className="content-grid" style={{ marginTop: "20px" }}>
            <AlertsPanel
              roadBlocked={roadBlocked}
              alerts={simulationData.alerts}
            />
            <EventFeed simulationData={simulationData} />
          </div>
        </div>
      ) : (
        <div className="simulation-dashboard">

      {/* SIH JUDGE INTERACTIVE 12-STEP DEMONSTRATION PANEL */}
      {showDemoGuide && (
        <div
          className="panel"
          style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
            borderColor: "#3b82f6",
            marginBottom: "24px",
            boxShadow: "0 8px 24px rgba(59, 130, 246, 0.15)"
          }}
        >
          <div className="panel-header" style={{ borderBottom: "1px solid #1f2937", paddingBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={20} color="#60a5fa" />
              <div>
                <h3 style={{ margin: 0, color: "#60a5fa", fontSize: "16px" }}>SIH Decision Support Walkthrough (12-Step Lifecycle)</h3>
                <small style={{ color: "#9ca3af" }}>Interactive demonstration pipeline designed for SIH jury evaluation</small>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => {
                  const prev = Math.max(1, currentDemoStep - 1);
                  setCurrentDemoStep(prev);
                  if (sihDemoSteps[prev - 1]?.action) sihDemoSteps[prev - 1].action();
                }}
                disabled={currentDemoStep === 1}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: currentDemoStep === 1 ? "#64748b" : "#e2e8f0",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: currentDemoStep === 1 ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                Previous Step
              </button>

              <button
                onClick={() => {
                  const next = Math.min(12, currentDemoStep + 1);
                  setCurrentDemoStep(next);
                  if (sihDemoSteps[next - 1]?.action) sihDemoSteps[next - 1].action();
                }}
                disabled={currentDemoStep === 12}
                style={{
                  background: "#2563eb",
                  border: "none",
                  color: "white",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  cursor: currentDemoStep === 12 ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                Next Step
              </button>

              <button
                onClick={() => {
                  setCurrentDemoStep(1);
                  setRoadBlocked(false);
                  setSelectedRoute("fastest");
                }}
                title="Reset to Step 1"
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* ACTIVE STEP SPOTLIGHT */}
          <div style={{ padding: "16px 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold",
                color: "white"
              }}
            >
              {currentDemoStep}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <strong style={{ fontSize: "16px", color: "white" }}>
                  {sihDemoSteps[currentDemoStep - 1]?.title}
                </strong>
                <span className="status-pill badge-assigned" style={{ fontSize: "11px" }}>
                  {sihDemoSteps[currentDemoStep - 1]?.badge}
                </span>
              </div>
              <p style={{ margin: "0 0 6px 0", color: "#cbd5e1", fontSize: "13px" }}>
                {sihDemoSteps[currentDemoStep - 1]?.desc}
              </p>
              <small style={{ color: "#38bdf8", fontWeight: 500 }}>
                💡 {sihDemoSteps[currentDemoStep - 1]?.hint}
              </small>
            </div>
          </div>

          {/* HORIZONTAL STEP CHIPS */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingTop: "12px",
              borderTop: "1px solid #1f2937",
              scrollbarWidth: "thin"
            }}
          >
            {sihDemoSteps.map((s) => {
              const isActive = s.num === currentDemoStep;
              const isPast = s.num < currentDemoStep;

              return (
                <button
                  key={s.num}
                  onClick={() => {
                    setCurrentDemoStep(s.num);
                    if (s.action) s.action();
                  }}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: isActive ? "#3b82f6" : isPast ? "#1e293b" : "#0f172a",
                    border: `1px solid ${isActive ? "#60a5fa" : isPast ? "#334155" : "#1e293b"}`,
                    color: isActive ? "white" : isPast ? "#93c5fd" : "#64748b",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>{s.num}.</span>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* STAT CARDS */}
      <div className="stats-grid">

        <div className="stat-card" onClick={() => setActiveTab("drones")} style={{ cursor: "pointer" }}>
          <div className="stat-icon">
            <Plane />
          </div>

          <div>
            <p>Active Drones</p>
            <h2>
              {activeDrones}/{drones.length}
            </h2>
          </div>
        </div>


        <div className="stat-card" onClick={() => setActiveTab("victims")} style={{ cursor: "pointer" }}>
          <div className="stat-icon">
            <Users />
          </div>

          <div>
            <p>Victims Detected</p>
            <h2>
              {victims.length}
            </h2>
          </div>
        </div>


        <div className="stat-card" onClick={() => setActiveTab("victims")} style={{ cursor: "pointer" }}>
          <div className="stat-icon danger">
            <AlertTriangle />
          </div>

          <div>
            <p>High Priority</p>
            <h2>
              {highPriorityVictims}
            </h2>
          </div>
        </div>


        <div className="stat-card" onClick={() => setActiveTab("missions")} style={{ cursor: "pointer" }}>
          <div className="stat-icon">
            <Target />
          </div>

          <div>
            <p>Active Mission</p>
            <h2>{simulationData.mission?.id || "M-001"}</h2>
          </div>
        </div>

      </div>


      {/* DRONE + MISSION SECTION */}
      <div className="content-grid">


        {/* DRONE FLEET */}
        <div className="panel">

          <div className="panel-header">
            <h3>Drone Fleet Status</h3>
            <span>
              {drones.length} Units
            </span>
          </div>


          <div className="drone-list">

            {drones.map(drone => {
              const isAssigned = drone.id === rescue.assignedDrone;
              const isSelected = selectedDroneId === drone.id;
              const statusText = isAssigned
                ? (rescue.distance < 20 ? "RESCUING" : "ASSIGNED")
                : (drone.status || (drone.available ? "SEARCHING" : "UNAVAILABLE"));

              return (
                <div
                  className={`drone-row ${isSelected ? "selected-row" : ""}`}
                  key={drone.id}
                  onClick={() => setSelectedDroneId(drone.id)}
                  style={{ cursor: "pointer" }}
                >

                  <div className="drone-name">

                    <div className="drone-avatar" style={{ background: isAssigned ? "#ef4444" : "#1e293b" }}>
                      <Plane size={18} color="white" />
                    </div>

                    <div>
                      <strong>
                        DRONE-{String(drone.id).padStart(2, "0")}
                      </strong>

                      <small style={{ color: isAssigned ? "#f59e0b" : drone.available ? "#22c55e" : "#ef4444" }}>
                        {statusText}
                      </small>
                    </div>

                  </div>


                  <div className="battery">
                    <Battery size={16} />
                    {drone.battery}%
                  </div>


                  <div className="signal">
                    <Radio size={16} />

                    {drone.available
                      ? "ONLINE"
                      : "OFFLINE"}
                  </div>

                </div>
              );
            })}

          </div>

        </div>


        {/* ACTIVE RESCUE MISSION */}
        <div className="panel mission-panel">

          <div className="panel-header">

            <h3>
              Active Rescue Mission
            </h3>

            <span className="priority-high">
              {rescue.priority}
            </span>

          </div>


          <div className="mission-info" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label>Target Victim</label>
              <strong>V-{rescue.targetVictim}</strong>
            </div>

            <div>
              <label>Assigned Drone</label>
              <strong style={{ color: "#60a5fa" }}>
                DRONE-{String(rescue.assignedDrone).padStart(2, "0")}
              </strong>
            </div>

            <div>
              <label>Battery</label>
              <strong style={{ color: droneBattery > 40 ? "#22c55e" : droneBattery > 20 ? "#f59e0b" : "#ef4444" }}>
                {droneBattery}%
              </strong>
            </div>

            <div>
              <label>Distance</label>
              <strong>{droneDistance.toFixed(2)} m</strong>
            </div>

            <div>
              <label>Speed</label>
              <strong>{droneSpeed} m/s</strong>
            </div>

            <div>
              <label>ETA</label>
              <strong style={{ color: "#facc15" }}>
                {typeof etaSeconds === "number" ? `${etaSeconds.toFixed(2)} sec` : `${etaSeconds}`}
              </strong>
            </div>

            <div style={{ gridColumn: "span 3", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0b1120", padding: "6px 10px", borderRadius: "6px", border: "1px solid #1f2937" }}>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>Fleet Availability:</span>
              <strong style={{ fontSize: "12px", color: assignedDroneObj.available ? "#22c55e" : "#ef4444" }}>
                {droneAvailability}
              </strong>
            </div>
          </div>

          {/* INTELLIGENT DRONE ASSIGNMENT REASON */}
          <div className="ai-box" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Award size={16} color="#3b82f6" />
              <strong style={{ fontSize: "12px", color: "#3b82f6" }}>ASSIGNMENT REASON</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#d1d5db", lineHeight: "1.4" }}>
              {assignmentReason}
            </p>
          </div>

          <button className="mission-button" onClick={() => setActiveTab("missions")}>
            VIEW MISSION INTELLIGENCE
          </button>

        </div>

      </div>

      {/* AI COMPUTER VISION & EXPLAINABLE VICTIM INTELLIGENCE */}
      <div className="content-grid" style={{ marginTop: "20px" }}>
        <YoloDetectionCard
          assignedDroneId={rescue.assignedDrone}
          targetVictim={victims.find(v => v.id === rescue.targetVictim) || victims[0]}
          simulationData={simulationData}
        />

        <VictimIntelligenceCard
          victims={victims}
          targetVictimId={rescue.targetVictim}
          rescue={rescue}
          simulationData={simulationData}
        />
      </div>

      <LiveMap
        drones={drones}
        victims={victims}
        selectedRoute={selectedRoute}
        roadBlocked={roadBlocked}
        assignedDroneId={rescue.assignedDrone}
        targetVictimId={rescue.targetVictim}
        mapLayers={mapLayers}
      />

      {/* ROUTE PLANNER */}
      <RoutePlanner
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        roadBlocked={roadBlocked}
        setRoadBlocked={setRoadBlocked}
        simulationRoutes={simulationData.routes}
      />

      {/* INCIDENT ALERTS & REAL-TIME EVENT TIMELINE */}
      <div className="content-grid" style={{ marginTop: "20px" }}>
        <AlertsPanel
          roadBlocked={roadBlocked}
          alerts={simulationData.alerts}
        />

        <EventFeed simulationData={simulationData} />
      </div>

      <AnalyticsPanel
        drones={drones}
        victims={victims}
        simulationData={simulationData}
      />
        </div>
      )}
    </div>
  );
}

export default Dashboard;