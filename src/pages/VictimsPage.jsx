import { Users, AlertTriangle, CheckCircle2, Clock, MapPin, Target } from "lucide-react";

function VictimsPage({ victims = [], rescue = {}, simulationData = {} }) {
  const getPriorityBadge = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return <span className="priority-tag high">HIGH PRIORITY</span>;
      case "MEDIUM":
        return <span className="priority-tag medium">MEDIUM PRIORITY</span>;
      case "LOW":
        return <span className="priority-tag low">LOW PRIORITY</span>;
      default:
        return <span className="priority-tag default">{priority}</span>;
    }
  };

  const highPriorityCount = victims.filter((v) => v.priority === "HIGH").length;
  const mediumPriorityCount = victims.filter((v) => v.priority === "MEDIUM").length;
  const lowPriorityCount = victims.filter((v) => v.priority === "LOW").length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Victim Monitoring & Triage</h1>
          <p>Autonomous victim detection, distress prioritization, and rescue allocation</p>
        </div>
        <div className="live-status">
          <span></span> {victims.length} VICTIMS DETECTED
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users />
          </div>
          <div>
            <p>Total Detected</p>
            <h2>{victims.length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <AlertTriangle />
          </div>
          <div>
            <p>High Priority (Critical)</p>
            <h2>{highPriorityCount}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock />
          </div>
          <div>
            <p>Medium Priority</p>
            <h2>{mediumPriorityCount}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle2 />
          </div>
          <div>
            <p>Low Priority (Stable)</p>
            <h2>{lowPriorityCount}</h2>
          </div>
        </div>
      </div>

      {/* VICTIM DETAILS TABLE */}
      <div className="panel">
        <div className="panel-header">
          <h3>Detected Incident Coordinates & Triage Queue</h3>
          <span>Sorted by urgency and rescue allocation</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Victim ID</th>
                <th>Priority Level</th>
                <th>Coordinates (X, Y)</th>
                <th>Detection Status</th>
                <th>Assigned Drone</th>
                <th>Rescue Status</th>
                <th>Est. Rescue Time</th>
              </tr>
            </thead>
            <tbody>
              {victims.map((v) => {
                const isTarget = v.id === rescue.target_victim;
                const assignedDroneStr = isTarget
                  ? `DRONE-${String(rescue.assigned_drone).padStart(2, "0")}`
                  : (v.assignedDrone ? `DRONE-${String(v.assignedDrone).padStart(2, "0")}` : "Queued (Standby)");
                
                const rescueStatusStr = isTarget
                  ? (rescue.distance && rescue.distance < 20 ? "RESCUE IN PROGRESS" : "DISPATCH EN ROUTE")
                  : "MONITORING";

                const estTime = isTarget
                  ? (simulationData.mission?.estTime || `${Math.round(rescue.distance / 10 || 7)}s`)
                  : "Pending Allocation";

                return (
                  <tr key={v.id} className={isTarget ? "highlight-row" : ""}>
                    <td>
                      <div className="victim-id-cell">
                        <span className="victim-dot"></span>
                        <strong>Victim V-{v.id}</strong>
                      </div>
                    </td>
                    <td>{getPriorityBadge(v.priority)}</td>
                    <td>
                      <div className="cell-coords">
                        <MapPin size={14} />
                        ({v.x}, {v.y})
                      </div>
                    </td>
                    <td>
                      <span className="status-pill badge-searching">DETECTED (VERIFIED)</span>
                    </td>
                    <td>
                      <strong>{assignedDroneStr}</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${isTarget ? "badge-assigned" : "badge-default"}`}>
                        {rescueStatusStr}
                      </span>
                    </td>
                    <td>
                      <strong>{estTime}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ai-box" style={{ marginTop: "20px" }}>
          <h4>AI Triage & Prioritization Protocol</h4>
          <p>
            Victims classified as <strong>HIGH PRIORITY</strong> automatically preempt active search tasks. The decision-support
            engine optimizes the multi-drone dispatch sequence using Euclidean distance, remaining drone battery, and ground rescue accessibility.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VictimsPage;
