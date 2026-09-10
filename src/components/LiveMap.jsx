import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

const droneIcon = L.divIcon({
  className: "drone-marker",
  html: "🚁",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const assignedDroneIcon = L.divIcon({
  className: "drone-marker assigned-drone-marker",
  html: "<div style='filter: drop-shadow(0 0 8px #ef4444); transform: scale(1.15); display: inline-block;'>🚁</div>",
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

const getVictimIcon = (priority) => {
  let iconHtml = "🔴";
  if (priority === "MEDIUM") iconHtml = "🟠";
  if (priority === "LOW") iconHtml = "🟢";

  return L.divIcon({
    className: "victim-marker",
    html: iconHtml,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const rescueIcon = L.divIcon({
  className: "rescue-marker",
  html: "🚑",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const blockageIcon = L.divIcon({
  className: "blockage-marker",
  html: "⛔",
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function LiveMap({
  drones = [],
  victims = [],
  selectedRoute = "fastest",
  roadBlocked = false,
  assignedDroneId = 1,
  targetVictimId = 1,
  mapLayers = { showDrones: true, showVictims: true, showRoutes: true }
}) {
  const toMapPosition = (x, y) => {
    return [
      13.0827 + (Number(y) || 0) / 100000,
      80.2707 + (Number(x) || 0) / 100000
    ];
  };

  const mapDrones = (Array.isArray(drones) ? drones : []).map(drone => ({
    ...drone,
    position: toMapPosition(drone.x, drone.y)
  }));

  const mapVictims = (Array.isArray(victims) ? victims : []).map(victim => ({
    ...victim,
    position: toMapPosition(victim.x, victim.y)
  }));

  const baseRescueTeam = {
    name: "RESCUE TEAM 01",
    x: 500,
    y: 500,
    status: "READY"
  };

  const rescuePosition = toMapPosition(
    baseRescueTeam.x,
    baseRescueTeam.y
  );

  const targetVictim = mapVictims.find(v => v.id === targetVictimId) || mapVictims[0];

  // Dynamically compute corridors between rescue base and target victim
  let shortestRoute = [];
  let fastestRoute = [];
  let alternativeRoute = [];
  let blockagePosition = toMapPosition(650, 570);

  if (targetVictim) {
    const bx = baseRescueTeam.x;
    const by = baseRescueTeam.y;
    const tx = targetVictim.x || 650;
    const ty = targetVictim.y || 750;
    const dx = tx - bx;
    const dy = ty - by;

    // Shortest direct corridor
    shortestRoute = [
      rescuePosition,
      toMapPosition(bx + dx * 0.35 + dy * 0.05, by + dy * 0.35 - dx * 0.05),
      toMapPosition(bx + dx * 0.70 + dy * 0.03, by + dy * 0.70 - dx * 0.03),
      targetVictim.position
    ];

    // Fastest arterial corridor (arterial avenue bypass)
    fastestRoute = [
      rescuePosition,
      toMapPosition(bx + dx * 0.40 + dy * 0.18, by + dy * 0.40 - dx * 0.18),
      toMapPosition(bx + dx * 0.75 + dy * 0.12, by + dy * 0.75 - dx * 0.12),
      targetVictim.position
    ];

    // Alternative perimeter corridor (bypassing the blocked arterial route)
    alternativeRoute = [
      rescuePosition,
      toMapPosition(bx + dx * 0.30 - dy * 0.22, by + dy * 0.30 + dx * 0.22),
      toMapPosition(bx + dx * 0.65 - dy * 0.18, by + dy * 0.65 + dx * 0.18),
      toMapPosition(bx + dx * 0.90 - dy * 0.08, by + dy * 0.90 + dx * 0.08),
      targetVictim.position
    ];

    // Position the blockage icon along the primary route
    blockagePosition = toMapPosition(
      bx + dx * 0.55 + (selectedRoute === "fastest" ? dy * 0.15 : dy * 0.04),
      by + dy * 0.55 - (selectedRoute === "fastest" ? dx * 0.15 : dx * 0.04)
    );
  }

  let groundRoute = [];
  if (targetVictim) {
    if (roadBlocked) {
      groundRoute = alternativeRoute;
    } else if (selectedRoute === "shortest") {
      groundRoute = shortestRoute;
    } else {
      groundRoute = fastestRoute;
    }
  }

  const assignedDrone = mapDrones.find(
    drone => drone.id === assignedDroneId
  ) || mapDrones.find(d => d.status === "ASSIGNED" || d.status === "RESCUING") || mapDrones[0];

  return (
    <div className="map-panel">
      <div className="map-header">
        <div>
          <h2>Live Disaster Map</h2>
          <p>Real-time autonomous drone tracking, victim geolocation, and ground routing</p>
        </div>
        <div className="map-live">
          ● LIVE TELEMETRY
        </div>
      </div>

      <MapContainer
        center={[13.0827, 80.2707]}
        zoom={14}
        style={{
          height: "550px",
          width: "100%"
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* DRONES LAYER */}
        {mapLayers.showDrones && mapDrones.map(drone => {
          const isAssigned = drone.id === (assignedDrone?.id ?? assignedDroneId);
          return (
            <Marker
              key={drone.id}
              position={drone.position}
              icon={isAssigned ? assignedDroneIcon : droneIcon}
            >
              <Popup>
                <strong>DRONE-{String(drone.id).padStart(2, "0")} {isAssigned ? "(ASSIGNED TARGET)" : ""}</strong>
                <br />
                Status: <strong style={{ color: isAssigned ? "#ef4444" : drone.available ? "#22c55e" : "#f59e0b" }}>
                  {isAssigned ? "ASSIGNED (EN ROUTE)" : (drone.status || (drone.available ? "SEARCHING" : "OFFLINE"))}
                </strong>
                <br />
                Battery: {drone.battery}%
                <br />
                Altitude: {drone.altitude} m
                <br />
                Speed: {drone.speed} m/s
                <br />
                Position: ({drone.x}, {drone.y})
              </Popup>
            </Marker>
          );
        })}

        {/* VICTIMS LAYER */}
        {mapLayers.showVictims && mapVictims.map(victim => (
          <Marker
            key={victim.id}
            position={victim.position}
            icon={getVictimIcon(victim.priority)}
          >
            <Popup>
              <strong>Victim V-{victim.id}</strong>
              <br />
              Priority: <strong style={{ color: victim.priority === "HIGH" ? "red" : victim.priority === "MEDIUM" ? "orange" : "green" }}>{victim.priority}</strong>
              <br />
              Status: {victim.status || "DETECTED"}
              <br />
              Coordinates: ({victim.x}, {victim.y})
            </Popup>
          </Marker>
        ))}

        {/* RESCUE TEAM */}
        <Marker
          position={rescuePosition}
          icon={rescueIcon}
        >
          <Popup>
            <strong>{baseRescueTeam.name}</strong>
            <br />
            Status: {baseRescueTeam.status}
          </Popup>
        </Marker>

        {/* ROAD BLOCKAGE MARKER */}
        {roadBlocked && (
          <Marker
            position={blockagePosition}
            icon={blockageIcon}
          >
            <Popup>
              <strong style={{ color: "red" }}>ROAD BLOCKAGE DETECTED</strong>
              <br />
              Debris obstruction at Sector Bravo. Alternative ground corridor activated.
            </Popup>
          </Marker>
        )}

        {/* DRONE → VICTIM DASHED ROUTE */}
        {mapLayers.showRoutes && assignedDrone && targetVictim && (
          <Polyline
            positions={[
              assignedDrone.position,
              targetVictim.position
            ]}
            pathOptions={{
              color: "#ef4444",
              weight: 4,
              dashArray: "10, 10"
            }}
          />
        )}

        {/* GROUND RESCUE ROUTE */}
        {mapLayers.showRoutes && groundRoute.length > 0 && (
          <Polyline
            positions={groundRoute}
            pathOptions={{
              color: roadBlocked ? "#f59e0b" : "#2563eb",
              weight: 6,
              dashArray: roadBlocked ? "12, 8" : "8, 8"
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default LiveMap;