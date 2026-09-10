import { Target, Plane, Users, Navigation, AlertTriangle, CheckCircle, Clock, Award } from "lucide-react";

function MissionsPage({ simulationData = {}, drones = [], victims = [], rescue = {} }) {
  const mission = simulationData.mission || {
    id: "M-001",
    status: "IN PROGRESS",
    targetVictim: rescue.target_victim || 1,
    assignedDrone: rescue.assigned_drone || 1,
    estTime: "7 sec",
    distance: `${Number(rescue.distance || 70.7).toFixed(1)} m`
  };

  const decision = simulationData.decision_support || {
    selected_drone_id: rescue.assigned_drone || 1,
    target_victim_id: rescue.target_victim || 1,
    recommendation: `DRONE-${String(rescue.assigned_drone || 1).padStart(2, "0")} selected for V-${rescue.target_victim || 1}: ${rescue.priority || "HIGH"} priority + shortest response time + sufficient battery reserve.`,
    scores: [0.91, 0.76, 0.71, 0.80, 0.79],
    road_blocked: false,
    selected_ground_route: "fastest"
  };

  const stages = [
    { label: "Target Detection", status: "completed" },
    { label: "AI Drone Assignment", status: "completed" },
    { label: "Aerial Intercept", status: "in-progress" },
    { label: "Ground Rendezvous", status: decision.road_blocked ? "rerouting" : "scheduled" },
    { label: "Victim Extrication", status: "pending" },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Mission Command & Dispatch</h1>
          <p>Autonomous mission planning, multi-drone allocation, and decision-support reasoning</p>
        </div>
        <div className="live-status">
          <span></span> MISSION ACTIVE ({mission.id})
        </div>
      </div>

      {/* MISSION STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Target />
          </div>
          <div>
            <p>Mission Identifier</p>
            <h2>{mission.id}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Plane />
          </div>
          <div>
            <p>Assigned Drone</p>
            <h2>DRONE-{String(mission.assignedDrone).padStart(2, "0")}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <Users />
          </div>
          <div>
            <p>Target Victim</p>
            <h2>V-{mission.targetVictim}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock />
          </div>
          <div>
            <p>Est. Arrival Time</p>
            <h2>{mission.estTime}</h2>
          </div>
        </div>
      </div>

      {/* ACTIVE MISSION CARD & AI DECISION SUPPORT */}
      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Mission Execution Pipeline</h3>
            <span className="status-pill badge-assigned">{mission.status}</span>
          </div>

          <div className="mission-progress-stepper">
            {stages.map((stage, idx) => (
              <div key={idx} className={`stepper-step ${stage.status}`}>
                <div className="stepper-dot">
                  {stage.status === "completed" ? "✓" : idx + 1}
                </div>
                <div className="stepper-content">
                  <strong>{stage.label}</strong>
                  <small>{stage.status.toUpperCase()}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="mission-info-details">
            <div className="detail-box">
              <label>DISTANCE TO VICTIM</label>
              <strong>{mission.distance}</strong>
            </div>
            <div className="detail-box">
              <label>GROUND RESCUE CORRIDOR</label>
              <strong style={{ color: decision.road_blocked ? "#f59e0b" : "#3b82f6" }}>
                {decision.road_blocked ? "ALTERNATIVE ROUTE (ROAD BLOCKED)" : "FASTEST ROUTE"}
              </strong>
            </div>
            <div className="detail-box">
              <label>ASSIGNED DRONE BATTERY</label>
              <strong style={{ color: rescue.battery > 40 ? "#22c55e" : "#ef4444" }}>
                {rescue.battery}%
              </strong>
            </div>
            <div className="detail-box">
              <label>TARGET PRIORITY</label>
              <strong className="priority-high">{rescue.priority || "HIGH"}</strong>
            </div>
          </div>
        </div>

        {/* AI DECISION SUPPORT PANEL */}
        <div className="panel">
          <div className="panel-header">
            <h3>AI Decision Support Rationale</h3>
            <Award size={18} color="#3b82f6" />
          </div>

          <div className="ai-recommendation-box">
            <div className="ai-badge">OPTIMAL ALLOCATION RECOMMENDATION</div>
            <p className="ai-reason-text">"{decision.recommendation}"</p>
          </div>

          <div className="scoring-breakdown">
            <h4>Multi-Criteria Drone Evaluation Scores</h4>
            <p className="scoring-formula">
              Formula: <code>Score = 0.45·Dist + 0.25·Bat + 0.15·Speed + 0.15·Avail</code>
            </p>

            <div className="score-bars-list">
              {drones.map((d, index) => {
                const scoreVal = decision.scores && decision.scores[index] ? decision.scores[index] : 0.7;
                const isSelected = d.id === decision.selected_drone_id;
                return (
                  <div key={d.id} className={`score-row ${isSelected ? "selected" : ""}`}>
                    <span className="drone-tag">DRONE-{String(d.id).padStart(2, "0")}</span>
                    <div className="score-bar-track">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${Math.round(scoreVal * 100)}%`,
                          background: isSelected ? "#22c55e" : "#3b82f6"
                        }}
                      ></div>
                    </div>
                    <strong className="score-val">{(scoreVal * 100).toFixed(0)}%</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-VICTIM MISSION QUEUE TABLE */}
      <div className="panel" style={{ marginTop: "24px" }}>
        <div className="panel-header">
          <h3>Incident Mission Queue & Dispatch Registry</h3>
          <span>Dynamic status tracking across all detected casualties</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mission ID</th>
                <th>Target Victim</th>
                <th>Priority</th>
                <th>Assigned Drone</th>
                <th>Distance</th>
                <th>Estimated Time</th>
                <th>Mission Status</th>
              </tr>
            </thead>
            <tbody>
              {victims.map((v) => {
                const isTarget = v.id === rescue.target_victim;
                const mId = `M-${String(v.id).padStart(3, "0")}`;
                const assignedDroneId = isTarget ? rescue.assigned_drone : v.assignedDrone;
                const assignedDroneStr = assignedDroneId
                  ? `DRONE-${String(assignedDroneId).padStart(2, "0")}`
                  : "Unassigned (In Queue)";
                
                let mStatus = v.status || "QUEUED";
                if (isTarget) {
                  mStatus = rescue.distance && rescue.distance < 20 ? "RESCUING" : (v.status || "EN_ROUTE");
                }

                const distStr = isTarget && rescue.distance ? `${Number(rescue.distance).toFixed(1)} m` : "Pending Intercept";
                const estTimeStr = isTarget
                  ? (simulationData.mission?.estTime || `${Math.round(rescue.distance / 10 || 7)}s`)
                  : (v.status === "RESCUED" ? "Completed" : "Queued");

                return (
                  <tr key={v.id} className={isTarget ? "highlight-row" : ""}>
                    <td>
                      <div className="victim-id-cell">
                        <span className="victim-dot" style={{ background: isTarget ? "#ef4444" : "#3b82f6" }}></span>
                        <strong>{mId}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>Victim V-{v.id}</strong> ({v.x}, {v.y})
                    </td>
                    <td>
                      <span className={`priority-tag ${v.priority?.toLowerCase() || "high"}`}>
                        {v.priority || "HIGH"}
                      </span>
                    </td>
                    <td>
                      <strong>{assignedDroneStr}</strong>
                    </td>
                    <td>{distStr}</td>
                    <td>{estTimeStr}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          mStatus === "RESCUED"
                            ? "badge-searching"
                            : isTarget
                            ? "badge-assigned"
                            : "badge-default"
                        }`}
                      >
                        {mStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MissionsPage;
