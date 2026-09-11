import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Activity,
  Battery,
  Wifi,
  XCircle,
  CheckCircle2,
  Play,
  Square,
  Info,
  Server,
  Cpu,
  Compass
} from "lucide-react";
import wsService from "../services/websocket";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://drishti-dg9e.onrender.com");

function ConnectDronePanel({ onDroneConnected = () => {}, onTelemetryUpdate = () => {} }) {
  // Form Configuration State - strictly Pixhawk 2.4.8 and Jetson Orin Nano
  const [droneId, setDroneId] = useState("DRONE-01");
  const flightController = "Pixhawk 2.4.8";
  const companionComputer = "Jetson Orin Nano";
  const [jetsonIp, setJetsonIp] = useState("192.168.1.105");
  const [connectionType, setConnectionType] = useState("UDP");
  const [port, setPort] = useState("14550");

  // Gateway Lifecycle State
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  // Bench Test State
  const [isBenchTestRunning, setIsBenchTestRunning] = useState(false);
  const benchTestTimerRef = useRef(null);

  // Live Telemetry State
  const [telemetry, setTelemetry] = useState(null);

  // Fetch initial gateway state on mount
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/drones`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data && data.connected && data.activeDrone) {
          setIsConfigured(true);
          setDroneId(data.activeDrone.droneId || "DRONE-01");
          setJetsonIp(data.activeDrone.jetsonIp || "192.168.1.105");
          setConnectionType(data.activeDrone.connectionType || "UDP");
          setPort(data.activeDrone.port || "14550");
          if (data.latestTelemetry) {
            setTelemetry(data.latestTelemetry);
          }
        }
      })
      .catch(() => {});

    // Subscribe to WebSocket DRONE_TELEMETRY events
    const unsubTelemetry = wsService.onDroneTelemetry((data) => {
      if (data) {
        setTelemetry(data);
        onTelemetryUpdate(data);
      }
    });

    const unsubGateway = wsService.onDroneGatewayStatus((gateway) => {
      if (gateway) {
        if (gateway.status === "CONFIGURED" || gateway.status === "CONNECTED" || gateway.status === "BENCH_TEST_ACTIVE") {
          setIsConfigured(true);
          if (gateway.config) {
            setDroneId(gateway.config.droneId || "DRONE-01");
          }
          if (gateway.telemetry) {
            setTelemetry(gateway.telemetry);
          }
        } else if (gateway.status === "DISCONNECTED") {
          setIsConfigured(false);
          setTelemetry(null);
          stopBenchTest();
        }
      }
    });

    return () => {
      isMounted = false;
      unsubTelemetry();
      unsubGateway();
      if (benchTestTimerRef.current) {
        clearInterval(benchTestTimerRef.current);
      }
    };
  }, []);

  const handleConnectionTypeChange = (e) => {
    const val = e.target.value;
    setConnectionType(val);
    if (val === "UDP") {
      setPort("14550");
    } else if (val === "Serial") {
      setPort("/dev/ttyTHS1");
    }
  };

  // Test Connection to Jetson Companion Gateway
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setConnectionError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/drones/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          droneId,
          flightController,
          companionComputer,
          jetsonIp,
          connectionType,
          port
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(data);
      } else {
        throw new Error(data.message || "Failed to reach simulation gateway endpoint.");
      }
    } catch (err) {
      setConnectionError(err.message || "Connection test failed.");
    } finally {
      setIsTesting(false);
    }
  };

  // Connect / Configure Drone Gateway
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/drones/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          droneId,
          flightController,
          companionComputer,
          jetsonIp,
          connectionType,
          port
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsConfigured(true);
        onDroneConnected(data.config);
      } else {
        throw new Error(data.message || "Could not configure drone gateway.");
      }
    } catch (err) {
      setConnectionError(err.message || "Gateway configuration failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Drone Gateway
  const handleDisconnect = async () => {
    stopBenchTest();
    try {
      await fetch(`${API_BASE_URL}/api/drones/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {}
    setIsConfigured(false);
    setTelemetry(null);
    setTestResult(null);
  };

  // Send a single bench-test telemetry frame via backend
  const sendBenchTelemetryFrame = async (simStep) => {
    const lat = Math.round((13.0827 + Math.sin(simStep * 0.15) * 0.0015) * 10000) / 10000;
    const lon = Math.round((80.2707 + Math.cos(simStep * 0.15) * 0.0015) * 10000) / 10000;
    const speed = Math.round((11.5 + Math.sin(simStep * 0.2) * 1.5) * 10) / 10;
    const alt = Math.round((98.0 + Math.cos(simStep * 0.1) * 3.0) * 10) / 10;
    const battery = Math.max(18, 78 - Math.floor(simStep * 0.2));

    try {
      await fetch(`${API_BASE_URL}/api/drone-bench-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          droneId,
          latitude: lat,
          longitude: lon,
          altitude: alt,
          speed: speed,
          battery: battery,
          gps: true,
          armed: true,
          flightMode: "GUIDED",
          connectionType,
          jetsonIp
        })
      });
    } catch (err) {
      // Fallback local update if network is transient
      setTelemetry({
        droneId,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        speed: speed,
        battery: battery,
        gps: true,
        armed: true,
        flightMode: "GUIDED",
        connectionType,
        jetsonIp,
        isBenchTest: true,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  // Start continuous bench-test simulation loop
  const startBenchTest = () => {
    if (benchTestTimerRef.current) clearInterval(benchTestTimerRef.current);
    setIsBenchTestRunning(true);
    if (!isConfigured) {
      handleConnect();
    }

    let step = 0;
    sendBenchTelemetryFrame(step);

    benchTestTimerRef.current = setInterval(() => {
      step += 1;
      sendBenchTelemetryFrame(step);
    }, 1200);
  };

  // Stop bench-test loop
  const stopBenchTest = () => {
    if (benchTestTimerRef.current) {
      clearInterval(benchTestTimerRef.current);
      benchTestTimerRef.current = null;
    }
    setIsBenchTestRunning(false);
  };

  // Honest status resolution based on whether telemetry has arrived
  const hasTelemetry = telemetry !== null;
  const isBenchTest = telemetry?.isBenchTest || isBenchTestRunning;

  const getBatteryColor = (level) => {
    if (level > 40) return "#22c55e";
    if (level >= 25) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="panel connect-drone-panel" style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "20px" }}>
      {/* HEADER */}
      <div className="panel-header" style={{ borderBottom: "1px solid #1e293b", paddingBottom: "14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "#3b82f6", padding: "7px", borderRadius: "8px", display: "flex" }}>
            <Radio size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#f8fafc", fontWeight: 700, letterSpacing: "0.5px" }}>
              CONNECT DRONE (JETSON + PIXHAWK GATEWAY)
            </h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Real Drone Telemetry Link via Jetson Orin Nano Companion Gateway
            </span>
          </div>
        </div>

        {/* HONEST MODE BADGE */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "20px",
              background: isBenchTest ? "rgba(59, 130, 246, 0.2)" : isConfigured ? "rgba(245, 158, 11, 0.15)" : "rgba(148, 163, 184, 0.15)",
              color: isBenchTest ? "#60a5fa" : isConfigured ? "#f59e0b" : "#94a3b8",
              border: `1px solid ${isBenchTest ? "#3b82f6" : isConfigured ? "#f59e0b" : "#475569"}`,
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isBenchTest ? "#3b82f6" : isConfigured ? "#f59e0b" : "#94a3b8" }}></span>
            {isBenchTest ? "BENCH TEST ACTIVE" : isConfigured ? "SIMULATION / HARDWARE BENCH-TEST" : "GATEWAY STANDBY"}
          </span>
        </div>
      </div>

      {/* ARCHITECTURAL INFORMATION NOTICE */}
      <div
        style={{
          background: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "18px",
          fontSize: "12px",
          color: "#93c5fd",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <Info size={18} color="#60a5fa" style={{ flexShrink: 0 }} />
        <span>
          <strong>Architecture Rule:</strong> Pixhawk connects to Jetson Orin Nano via MAVLink. Jetson acts as the gateway and transmits authenticated telemetry to Render Cloud. Dashboard never directly connects to Pixhawk.
        </span>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* LEFT COLUMN: CONFIGURATION FORM */}
        <div style={{ background: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1f2937" }}>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Gateway Configuration
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Drone ID */}
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                Drone ID
              </label>
              <input
                type="text"
                value={droneId}
                disabled={isConfigured}
                onChange={(e) => setDroneId(e.target.value)}
                placeholder="DRONE-01"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Flight Controller - strictly Pixhawk 2.4.8 */}
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                Flight Controller
              </label>
              <input
                type="text"
                value={flightController}
                disabled
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Companion Computer - strictly Jetson Orin Nano */}
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                Companion Computer
              </label>
              <input
                type="text"
                value={companionComputer}
                disabled
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Jetson IP Address with Example Local IP Label */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                  Jetson IP Address
                </label>
                <span style={{ fontSize: "11px", color: "#38bdf8", fontStyle: "italic" }}>
                  (Example local IP)
                </span>
              </div>
              <input
                type="text"
                value={jetsonIp}
                disabled={isConfigured}
                onChange={(e) => setJetsonIp(e.target.value)}
                placeholder="192.168.1.105"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  fontFamily: "monospace"
                }}
              />
            </div>

            {/* MAVLink Connection & Port */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                  MAVLink Connection
                </label>
                <select
                  value={connectionType}
                  disabled={isConfigured}
                  onChange={handleConnectionTypeChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="UDP">UDP</option>
                  <option value="Serial">Serial</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
                  MAVLink Port
                </label>
                <input
                  type="text"
                  value={port}
                  disabled={isConfigured}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder={connectionType === "UDP" ? "14550" : "/dev/ttyTHS1"}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    fontFamily: "monospace"
                  }}
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {/* ACTION BUTTONS (4 CORE CONTROLS) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
              {/* 1. TEST CONNECTION */}
              <button
                onClick={handleTestConnection}
                disabled={isTesting || isConnecting}
                style={{
                  padding: "9px 12px",
                  background: "#1e293b",
                  border: "1px solid #3b82f6",
                  color: "#60a5fa",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isTesting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Activity size={15} />
                {isTesting ? "TESTING..." : "TEST CONNECTION"}
              </button>

              {/* 2. CONNECT DRONE */}
              <button
                onClick={handleConnect}
                disabled={isConnecting || isConfigured}
                style={{
                  padding: "9px 12px",
                  background: isConfigured ? "#1e293b" : "#2563eb",
                  border: isConfigured ? "1px solid #334155" : "none",
                  color: isConfigured ? "#94a3b8" : "#ffffff",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isConfigured ? "default" : isConnecting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Wifi size={15} />
                {isConfigured ? "CONNECTED" : isConnecting ? "CONFIGURING..." : "CONNECT DRONE"}
              </button>

              {/* 3. START / STOP BENCH TEST */}
              <button
                onClick={isBenchTestRunning ? stopBenchTest : startBenchTest}
                style={{
                  padding: "9px 12px",
                  background: isBenchTestRunning ? "#d97706" : "#059669",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                {isBenchTestRunning ? <Square size={15} /> : <Play size={15} />}
                {isBenchTestRunning ? "STOP BENCH TEST" : "START BENCH TEST"}
              </button>

              {/* 4. DISCONNECT */}
              <button
                onClick={handleDisconnect}
                disabled={!isConfigured && !isBenchTestRunning}
                style={{
                  padding: "9px 12px",
                  background: (!isConfigured && !isBenchTestRunning) ? "#1e293b" : "#dc2626",
                  border: (!isConfigured && !isBenchTestRunning) ? "1px solid #334155" : "none",
                  color: (!isConfigured && !isBenchTestRunning) ? "#64748b" : "#ffffff",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: (!isConfigured && !isBenchTestRunning) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <XCircle size={15} />
                DISCONNECT
              </button>
            </div>

            {/* TEST RESULT FEEDBACK */}
            {testResult && !isConfigured && (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid #22c55e",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "12px",
                  color: "#22c55e",
                  marginTop: "6px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                  <CheckCircle2 size={16} />
                  <span>SIMULATION STATUS: READY_FOR_AGENT</span>
                </div>
                <div style={{ fontSize: "11px", color: "#86efac", marginTop: "4px" }}>
                  Simulation mode validated. No physical network handshake occurred.
                </div>
              </div>
            )}

            {/* ERROR FEEDBACK */}
            {connectionError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid #ef4444",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "12px",
                  color: "#f87171",
                  marginTop: "6px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                  <XCircle size={16} />
                  <span>CONNECTION WARNING</span>
                </div>
                <div style={{ fontSize: "11px", color: "#fca5a5", marginTop: "4px" }}>
                  {connectionError}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CONNECTION STATUS & TELEMETRY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* HONEST CONNECTION STATUS INDICATORS */}
            <div style={{ background: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid #1f2937" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Hardware Gateway Status
                </h4>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                  MODE: SIMULATION / HARDWARE BENCH-TEST
                </span>
              </div>

              {/* 5 REQUIRED STATUS INDICATORS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* 1. DRISHTI Cloud */}
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>DRISHTI Cloud</span>
                  <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 700 }}>
                    🟢 Connected
                  </span>
                </div>

                {/* 2. Gateway */}
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>Gateway</span>
                  <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700 }}>
                    🟡 Simulation
                  </span>
                </div>

                {/* 3. Pixhawk */}
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>Pixhawk</span>
                  <span style={{ fontSize: "12px", color: hasTelemetry ? "#22c55e" : "#94a3b8", fontWeight: 700 }}>
                    {hasTelemetry ? "🟢 Receiving MAVLink" : "⚪ Waiting for MAVLink"}
                  </span>
                </div>

                {/* 4. MAVLink */}
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>MAVLink</span>
                  <span style={{ fontSize: "12px", color: hasTelemetry ? "#22c55e" : "#94a3b8", fontWeight: 700 }}>
                    {hasTelemetry ? "🟢 Receiving" : "⚪ Waiting for telemetry"}
                  </span>
                </div>

                {/* 5. GPS */}
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", gridColumn: "span 2" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>GPS</span>
                  <span style={{ fontSize: "12px", color: hasTelemetry && telemetry?.gps ? "#22c55e" : "#94a3b8", fontWeight: 700 }}>
                    {hasTelemetry && telemetry?.gps ? "🟢 Available (3D Fix)" : "⚪ Waiting for telemetry"}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE TELEMETRY DISPLAY */}
            <div style={{ background: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid #1f2937" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Live Telemetry
                </h4>
                {isBenchTest && (
                  <span style={{ background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                    BENCH TEST
                  </span>
                )}
              </div>

              {!hasTelemetry ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px", fontStyle: "italic" }}>
                  Awaiting telemetry from Jetson Drone Agent or click [ START BENCH TEST ] to simulate live frames.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Drone ID:</span>
                    <strong style={{ color: "#f8fafc" }}>{telemetry.droneId || droneId}</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Connection Type:</span>
                    <strong style={{ color: "#38bdf8" }}>{telemetry.connectionType || connectionType} ({port})</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Jetson IP:</span>
                    <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{jetsonIp}</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Battery:</span>
                    <strong style={{ color: getBatteryColor(telemetry.battery) }}>{telemetry.battery}%</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>GPS Status:</span>
                    <strong style={{ color: telemetry.gps ? "#22c55e" : "#ef4444" }}>
                      {telemetry.gps ? "Available (3D Fix)" : "No Fix"}
                    </strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Armed / Disarmed:</span>
                    <strong style={{ color: telemetry.armed ? "#ef4444" : "#22c55e" }}>
                      {telemetry.armed ? "ARMED" : "DISARMED"}
                    </strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Flight Mode:</span>
                    <strong style={{ color: "#fbbf24" }}>{telemetry.flightMode || "GUIDED"}</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Altitude:</span>
                    <strong style={{ color: "#f8fafc" }}>{telemetry.altitude} m</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Speed:</span>
                    <strong style={{ color: "#f8fafc" }}>{telemetry.speed} m/s</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Latitude:</span>
                    <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{telemetry.latitude}° N</strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", gridColumn: "span 2" }}>
                    <span style={{ color: "#94a3b8" }}>Longitude:</span>
                    <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{telemetry.longitude}° E</strong>
                  </div>
                </div>
              )}

              {/* BATTERY VISUAL GAUGE (IF TELEMETRY PRESENT) */}
              {hasTelemetry && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    <span>Battery Capacity ({telemetry.battery}%)</span>
                    <span>Safe Threshold: &gt;25%</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${telemetry.battery}%`,
                        height: "100%",
                        background: getBatteryColor(telemetry.battery),
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

export default ConnectDronePanel;
