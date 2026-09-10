import {
  Navigation,
  Clock,
  Route,
  AlertTriangle
} from "lucide-react";

function RoutePlanner({
  selectedRoute = "fastest",
  setSelectedRoute = () => {},
  roadBlocked = false,
  setRoadBlocked = () => {},
  simulationRoutes = {}
}) {
  const routes = {
    shortest: {
      distance: simulationRoutes?.shortest_distance || "1.8 km",
      time: simulationRoutes?.shortest_time || "8 min"
    },
    fastest: {
      distance: simulationRoutes?.fastest_distance || "2.4 km",
      time: simulationRoutes?.fastest_time || "6 min"
    }
  };

  const route = routes[selectedRoute] || routes.fastest;

  return (
    <div className="route-panel">

      <div className="route-header">
        <div>
          <h2>Ground Rescue Route Planner</h2>
          <p>Rescue Team 01 → Target Victim</p>
        </div>

        <Navigation size={24} />
      </div>

      <div className="route-options">

        <button
          className={
            selectedRoute === "shortest"
              ? "route-option selected"
              : "route-option"
          }
          onClick={() => {
            setSelectedRoute("shortest");
            setRoadBlocked(false);
          }}
        >
          <Route size={20} />

          <div>
            <strong>Shortest Route</strong>
            <span>{routes.shortest.distance}</span>
          </div>
        </button>

        <button
          className={
            selectedRoute === "fastest"
              ? "route-option selected"
              : "route-option"
          }
          onClick={() => {
            setSelectedRoute("fastest");
            setRoadBlocked(false);
          }}
        >
          <Clock size={20} />

          <div>
            <strong>Fastest Route</strong>
            <span>{routes.fastest.distance}</span>
          </div>
        </button>

      </div>

      <div className="route-details">

        <div>
          <label>SELECTED ROUTE</label>
          <strong>
            {selectedRoute === "fastest"
              ? "FASTEST"
              : "SHORTEST"}
          </strong>
        </div>

        <div>
          <label>DISTANCE</label>
          <strong>{route.distance}</strong>
        </div>

        <div>
          <label>EST. TIME</label>
          <strong>{route.time}</strong>
        </div>

      </div>

      <div
        className={
          roadBlocked
            ? "road-alert blocked"
            : "road-alert"
        }
      >

        <AlertTriangle size={18} />

        <div>

          <strong>
            {roadBlocked
              ? "ROAD BLOCKED"
              : "ROAD STATUS: NORMAL"}
          </strong>

          <p>
            {roadBlocked
              ? "Blocked road detected. Alternative route calculated."
              : "All roads on selected route are available."}
          </p>

        </div>

      </div>

      <button
        className="block-button"
        onClick={() => setRoadBlocked(!roadBlocked)}
      >
        {roadBlocked ? "CLEAR ROAD BLOCKAGE" : "SIMULATE ROAD BLOCKAGE"}
      </button>

      {roadBlocked && (

        <button
          className="recalculate-button"
          onClick={() => setRoadBlocked(false)}
        >
          RECALCULATE ALTERNATIVE ROUTE
        </button>

      )}

    </div>
  );
}

export default RoutePlanner;