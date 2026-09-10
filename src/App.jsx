import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import DronesPage from "./pages/DronesPage";
import VictimsPage from "./pages/VictimsPage";
import MissionsPage from "./pages/MissionsPage";
import SettingsPage from "./pages/SettingsPage";
import LiveMap from "./components/LiveMap";
import RoutePlanner from "./components/RoutePlanner";
import AnalyticsPanel from "./components/AnalyticsPanel";
import { getSimulationData } from "./data/simulationAPI";
import wsService from "./services/websocket";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [simulationData, setSimulationData] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(2000);
  const [selectedRoute, setSelectedRoute] = useState("fastest");
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // 'websocket' | 'connecting' | 'polling' | 'offline'
  const [wsEnabled, setWsEnabled] = useState(true);
  const [mapLayers, setMapLayers] = useState({
    showDrones: true,
    showVictims: true,
    showRoutes: true
  });

  const pollingRef = useRef(null);

  // 0. Immediate Initial Telemetry Load on Mount
  useEffect(() => {
    let isMounted = true;
    getSimulationData().then((data) => {
      if (isMounted && data) {
        setSimulationData((prev) => prev || data);
        if (typeof data.road_blocked === "boolean") {
          setRoadBlocked(data.road_blocked);
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // 1. WebSocket Primary Real-Time Bus
  useEffect(() => {
    if (!simulationEnabled) {
      setConnectionStatus("offline");
      return;
    }

    if (!wsEnabled) {
      wsService.disconnect();
      setConnectionStatus("polling");
      return;
    }

    wsService.connect(
      (data) => {
        // Incoming real-time push data from WebSocket
        setSimulationData(data);
        if (data && typeof data.road_blocked === "boolean") {
          setRoadBlocked(data.road_blocked);
        }
      },
      (status) => {
        setConnectionStatus(status);
      }
    );

    return () => {
      wsService.disconnect();
    };
  }, [wsEnabled, simulationEnabled]);

  // 2. Fallback Polling Loop (Only active when WebSocket is disconnected or in polling mode)
  useEffect(() => {
    let isMounted = true;

    const runPolling = async () => {
      if (!simulationEnabled) return;
      try {
        const data = await getSimulationData();
        if (isMounted) {
          setSimulationData(data);
          if (data && typeof data.road_blocked === "boolean") {
            setRoadBlocked(data.road_blocked);
          }
        }
      } catch (err) {
        if (isMounted && connectionStatus === "polling") {
          setConnectionStatus("offline");
        }
      }
    };

    // If WebSocket is active, we don't need continuous polling
    if (connectionStatus === "websocket") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Run initial fallback fetch
    runPolling();

    // Start fallback polling interval
    const effectiveInterval = Math.max(500, Math.round(pollingInterval / (simSpeed || 1)));
    pollingRef.current = setInterval(runPolling, effectiveInterval);

    return () => {
      isMounted = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [connectionStatus, pollingInterval, simulationEnabled, simSpeed]);

  const drones = simulationData?.drones || [];
  const victims = simulationData?.victims || [];
  const rescue = simulationData?.rescue || {
    target_victim: 1,
    priority: "HIGH",
    assigned_drone: 1,
    distance: 70.7,
    battery: 90
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "map":
        return (
          <div className="page-container">
            <div className="page-header">
              <div>
                <h1>Live Disaster Mapping Center</h1>
                <p>Full tactical overview of autonomous aerial sweeps and ground routes</p>
              </div>
              <div className="connection-badge-container">
                <ConnectionBadge status={connectionStatus} />
              </div>
            </div>
            <LiveMap
              drones={drones}
              victims={victims}
              selectedRoute={selectedRoute}
              roadBlocked={roadBlocked}
              assignedDroneId={rescue.assigned_drone}
              targetVictimId={rescue.target_victim}
              mapLayers={mapLayers}
            />
            <div style={{ marginTop: "24px" }}>
              <RoutePlanner
                selectedRoute={selectedRoute}
                setSelectedRoute={setSelectedRoute}
                roadBlocked={roadBlocked}
                setRoadBlocked={setRoadBlocked}
                simulationRoutes={simulationData?.routes}
              />
            </div>
          </div>
        );

      case "drones":
        return <DronesPage drones={drones} rescue={rescue} simulationData={simulationData} />;

      case "victims":
        return <VictimsPage victims={victims} rescue={rescue} simulationData={simulationData} />;

      case "missions":
        return (
          <MissionsPage
            simulationData={simulationData}
            drones={drones}
            victims={victims}
            rescue={rescue}
          />
        );

      case "analytics":
        return (
          <div className="page-container">
            <div className="page-header">
              <div>
                <h1>Disaster Response Analytics</h1>
                <p>Telemetry metrics, battery drain rates, and victim triage statistics</p>
              </div>
              <div className="connection-badge-container">
                <ConnectionBadge status={connectionStatus} />
              </div>
            </div>
            <AnalyticsPanel
              drones={drones}
              victims={victims}
              simulationData={simulationData}
            />
          </div>
        );

      case "settings":
        return (
          <SettingsPage
            pollingInterval={pollingInterval}
            setPollingInterval={setPollingInterval}
            roadBlocked={roadBlocked}
            setRoadBlocked={setRoadBlocked}
            selectedRoute={selectedRoute}
            setSelectedRoute={setSelectedRoute}
            simulationEnabled={simulationEnabled}
            setSimulationEnabled={setSimulationEnabled}
            simSpeed={simSpeed}
            setSimSpeed={setSimSpeed}
            mapLayers={mapLayers}
            setMapLayers={setMapLayers}
            connectionStatus={connectionStatus}
            wsEnabled={wsEnabled}
            setWsEnabled={setWsEnabled}
            simulationData={simulationData}
            setSimulationData={setSimulationData}
          />
        );

      case "dashboard":
      default:
        return (
          <Dashboard
            setActiveTab={setActiveTab}
            mapLayers={mapLayers}
            simulationData={simulationData}
            connectionStatus={connectionStatus}
          />
        );
    }
  };

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">{renderActiveView()}</main>
    </div>
  );
}

/**
 * Reusable SIH Connection Status Badge Component
 */
export function ConnectionBadge({ status }) {
  switch (status) {
    case "websocket":
      return (
        <div className="live-status status-ws" title="Real-time telemetry streaming via WebSocket">
          <span className="dot-live"></span>
          <span style={{ fontWeight: 700, letterSpacing: "0.5px" }}>● WEBSOCKET CONNECTED</span>
        </div>
      );
    case "connecting":
      return (
        <div className="live-status status-connecting" title="Connecting to DRISHTI telemetry server...">
          <span className="dot-connecting"></span>
          <span>CONNECTING TO SERVER...</span>
        </div>
      );
    case "polling":
      return (
        <div className="live-status status-fallback" title="WebSocket offline; atomic JSON polling active">
          <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.15", textAlign: "left" }}>
            <span style={{ fontWeight: 700, letterSpacing: "0.3px" }}>⚠ WEBSOCKET OFFLINE</span>
            <span style={{ fontSize: "10px", opacity: 0.95, letterSpacing: "0.3px" }}>JSON FALLBACK ACTIVE</span>
          </div>
        </div>
      );
    case "offline":
    default:
      return (
        <div className="live-status status-offline" title="No active telemetry feed">
          <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.15", textAlign: "left" }}>
            <span style={{ fontWeight: 700 }}>⚠ OFFLINE</span>
            <span style={{ fontSize: "10px", opacity: 0.85 }}>NO DATA SOURCE</span>
          </div>
        </div>
      );
  }
}

export default App;