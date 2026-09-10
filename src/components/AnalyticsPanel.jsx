import { Plane, Users, Target, Clock, BatteryCharging, CheckCircle2, Award } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

function AnalyticsPanel({ drones = [], victims = [], simulationData = {} }) {
  const high = victims.filter(
    victim => victim.priority === "HIGH"
  ).length;

  const medium = victims.filter(
    victim => victim.priority === "MEDIUM"
  ).length;

  const low = victims.filter(
    victim => victim.priority === "LOW"
  ).length;

  const activeDronesCount = drones.filter(d => d.available).length;
  const avgBattery = drones.length > 0
    ? Math.round(drones.reduce((acc, d) => acc + (d.battery || 0), 0) / drones.length)
    : 85;

  const rescuedCount = simulationData?.analytics?.rescued_count || 0;
  const successRate = simulationData?.analytics?.success_rate || "98%";
  const avgRescueTime = simulationData?.mission?.estTime || simulationData?.analytics?.avg_response_time || "6 min";

  const activeMissions = simulationData?.analytics?.active_missions
    ?? (victims.some(v => v.status === "ASSIGNED" || v.status === "RESCUING" || v.status === "DETECTED") ? 1 : 0);

  const assignedDronesCount = drones.filter(d => d.status === "ASSIGNED" || d.status === "RESCUING" || d.id === simulationData?.rescue?.assigned_drone).length;
  const droneUtilization = drones.length > 0 ? Math.round((assignedDronesCount / drones.length) * 100) : 0;
  const successfulAssignments = simulationData?.analytics?.successful_assignments ?? (rescuedCount > 0 ? rescuedCount : (simulationData?.rescue?.assigned_drone ? 1 : 0));

  const chartData = drones.map(d => ({
    name: `D-${String(d.id).padStart(2, "0")}`,
    battery: Math.round(d.battery || 0),
    speed: d.speed || 10
  }));

  const getBarColor = (battery) => {
    if (battery > 40) return "#22c55e";
    if (battery >= 20) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="analytics-panel">
      <div className="analytics-header">
        <div>
          <h2>Rescue Analytics & Performance</h2>
          <p>Autonomous mission telemetry, fleet power reserves, and triage allocation</p>
        </div>
      </div>

      <div className="analytics-cards">
        <div className="analytics-card">
          <Users size={22} />
          <div>
            <span>Victims Detected</span>
            <strong>{victims.length}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <Plane size={22} />
          <div>
            <span>Drones Available</span>
            <strong>{activeDronesCount}/{drones.length}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <Target size={22} />
          <div>
            <span>Active Missions</span>
            <strong>{activeMissions}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <Clock size={22} />
          <div>
            <span>Avg. Rescue Time</span>
            <strong>{avgRescueTime}</strong>
          </div>
        </div>
      </div>

      {/* ADDITIONAL RESCUE PERFORMANCE METRICS */}
      <div className="analytics-cards" style={{ marginTop: "12px" }}>
        <div className="analytics-card">
          <CheckCircle2 size={22} color="#22c55e" />
          <div>
            <span>Victims Rescued</span>
            <strong style={{ color: "#22c55e" }}>{rescuedCount}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <Plane size={22} color="#60a5fa" />
          <div>
            <span>Drone Utilization</span>
            <strong style={{ color: "#60a5fa" }}>{droneUtilization}% ({assignedDronesCount}/{drones.length})</strong>
          </div>
        </div>

        <div className="analytics-card">
          <BatteryCharging size={22} />
          <div>
            <span>Avg. Fleet Battery</span>
            <strong>{avgBattery}%</strong>
          </div>
        </div>

        <div className="analytics-card">
          <Award size={22} color="#3b82f6" />
          <div>
            <span>Successful Assignments</span>
            <strong>{successfulAssignments}</strong>
          </div>
        </div>
      </div>

      <div className="analytics-chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px" }}>
        {/* RECHARTS BATTERY MONITOR */}
        <div className="priority-section" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: "12px" }}>Drone Battery Distribution (%)</h3>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#111827", borderColor: "#1f2937", borderRadius: 8, color: "#e5e7eb" }}
                  formatter={(val) => [`${val}%`, "Battery"]}
                />
                <Bar dataKey="battery" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={getBarColor(entry.battery)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PRIORITY DISTRIBUTION SECTION */}
        <div className="priority-section" style={{ marginTop: 0 }}>
          <h3>Victim Priority Distribution</h3>

          <div className="priority-row">
            <span>HIGH</span>
            <div className="priority-bar">
              <div
                className="priority-fill high-fill"
                style={{
                  width: `${(high / Math.max(victims.length, 1)) * 100}%`
                }}
              ></div>
            </div>
            <strong>{high}</strong>
          </div>

          <div className="priority-row">
            <span>MEDIUM</span>
            <div className="priority-bar">
              <div
                className="priority-fill medium-fill"
                style={{
                  width: `${(medium / Math.max(victims.length, 1)) * 100}%`
                }}
              ></div>
            </div>
            <strong>{medium}</strong>
          </div>

          <div className="priority-row">
            <span>LOW</span>
            <div className="priority-bar">
              <div
                className="priority-fill low-fill"
                style={{
                  width: `${(low / Math.max(victims.length, 1)) * 100}%`
                }}
              ></div>
            </div>
            <strong>{low}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPanel;