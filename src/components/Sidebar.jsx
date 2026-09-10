import {
  LayoutDashboard,
  Map,
  Plane,
  Users,
  Target,
  BarChart3,
  Settings
} from "lucide-react";

function Sidebar({ activeTab = "dashboard", setActiveTab = () => {} }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Live Map", icon: Map },
    { id: "drones", label: "Drones", icon: Plane },
    { id: "victims", label: "Victims", icon: Users },
    { id: "missions", label: "Missions", icon: Target },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="logo" onClick={() => setActiveTab("dashboard")} style={{ cursor: "pointer" }}>
        <div className="logo-icon">D</div>
        <div>
          <h2>DRISHTI</h2>
          <span>RESCUE INTELLIGENCE</span>
        </div>
      </div>

      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <a
              key={item.id}
              className={isActive ? "active" : ""}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={19} />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;