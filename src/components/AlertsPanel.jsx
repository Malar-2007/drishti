import {
  AlertTriangle,
  Plane,
  Users,
  Navigation,
  Radio
} from "lucide-react";

function AlertsPanel({ roadBlocked, alerts: dynamicAlerts }) {
  const defaultAlerts = [
    {
      type: "HIGH",
      icon: Users,
      title: "HIGH PRIORITY VICTIM DETECTED",
      message: "Victim V-1 requires immediate rescue.",
      time: "Just now"
    },
    {
      type: "INFO",
      icon: Plane,
      title: "DRONE ASSIGNED",
      message: "DRONE-01 assigned to Victim V-1.",
      time: "1 min ago"
    },
    {
      type: roadBlocked ? "HIGH" : "WARNING",
      icon: roadBlocked ? AlertTriangle : Navigation,
      title: roadBlocked
        ? "ROAD BLOCKED"
        : "ROAD CONDITION MONITORED",
      message: roadBlocked
        ? "Selected rescue route is blocked. Alternative route required."
        : "Ground rescue route is currently available.",
      time: roadBlocked
        ? "Just now"
        : "2 min ago"
    },
    {
      type: "INFO",
      icon: Radio,
      title: "DRONE FLEET ONLINE",
      message: "5 drones are currently connected.",
      time: "3 min ago"
    }
  ];

  // Helper to pick appropriate icon for dynamic alerts
  const getAlertIcon = (title = "", type = "") => {
    const lower = title.toLowerCase();
    if (lower.includes("victim")) return Users;
    if (lower.includes("drone") || lower.includes("dispatched") || lower.includes("assigned")) return Plane;
    if (lower.includes("road") || lower.includes("blocked") || lower.includes("corridor")) return AlertTriangle;
    if (lower.includes("battery")) return AlertTriangle;
    if (type === "HIGH") return AlertTriangle;
    return Radio;
  };

  const activeAlerts = (dynamicAlerts && dynamicAlerts.length > 0)
    ? dynamicAlerts.map(a => ({
        ...a,
        icon: getAlertIcon(a.title, a.type)
      }))
    : defaultAlerts;

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <div>
          <h2>Emergency Alerts</h2>
          <p>Real-time autonomous mission notifications and critical telemetry</p>
        </div>

        <div className="alert-count">
          {activeAlerts.length}
        </div>
      </div>

      <div className="alerts-list">
        {activeAlerts.map((alert, index) => {
          const Icon = alert.icon;

          return (
            <div
              className={`alert-item ${alert.type ? alert.type.toLowerCase() : "info"}`}
              key={index}
            >
              <div className="alert-icon">
                <Icon size={20} />
              </div>

              <div className="alert-content">
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
                <span>{alert.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertsPanel;