import React from "react";
import { Activity, CheckCircle2, Clock, Navigation, Plane, Target, Users, AlertCircle } from "lucide-react";

/**
 * Real-Time Event Feed & Mission Timeline Component
 * -------------------------------------------------
 * Compact mission/event timeline tracking the 6 core lifecycle milestones:
 * 1. PERSON DETECTED
 * 2. VICTIM PRIORITIZED
 * 3. DRONE ASSIGNED
 * 4. MISSION CREATED
 * 5. ROUTE CALCULATED
 * 6. RESCUE IN PROGRESS
 */
function EventFeed({ simulationData = null }) {
  const targetVictimId = simulationData?.rescue?.target_victim || 1;
  const assignedDroneId = simulationData?.rescue?.assigned_drone || 1;
  const targetVictim = simulationData?.victims?.find(v => v.id === targetVictimId) || {
    id: targetVictimId,
    x: 650,
    y: 750,
    priority: "HIGH",
    status: "ASSIGNED"
  };

  const isRoadBlocked = Boolean(simulationData?.road_blocked || simulationData?.routes?.road_blocked);
  const estTime = simulationData?.mission?.estTime || `${Math.round((simulationData?.rescue?.distance || 70.7) / 10)} sec`;
  const isRescued = targetVictim.status === "RESCUED";
  const timestamp = simulationData?.timestamp || new Date().toLocaleTimeString();

  // If the backend has provided custom events array, use them; otherwise construct the canonical 6-stage lifecycle
  const events = [
    {
      id: "ev-1",
      title: "PERSON DETECTED",
      desc: `Visual geometry lock on casualty V-${targetVictim.id} at coordinates (${targetVictim.x}, ${targetVictim.y})`,
      time: simulationData?.alerts?.[0]?.time || "Verified",
      status: "completed",
      icon: Users
    },
    {
      id: "ev-2",
      title: "VICTIM PRIORITIZED",
      desc: `Urgency evaluated as ${targetVictim.priority || "HIGH"} priority based on active hazard proximity`,
      time: "Evaluated",
      status: "completed",
      icon: Target
    },
    {
      id: "ev-3",
      title: "DRONE ASSIGNED",
      desc: `DRONE-${String(assignedDroneId).padStart(2, "0")} allocated via multi-criteria battery & ETA optimization`,
      time: "Dispatched",
      status: "completed",
      icon: Plane
    },
    {
      id: "ev-4",
      title: "MISSION CREATED",
      desc: `Incident Mission ${simulationData?.mission?.id || "M-001"} active in command registry`,
      time: "Active",
      status: "completed",
      icon: Activity
    },
    {
      id: "ev-5",
      title: "ROUTE CALCULATED",
      desc: isRoadBlocked
        ? "Alternative perimeter detour corridor calculated (arterial obstruction)"
        : "Fastest ground arterial corridor selected from Base to sector",
      time: isRoadBlocked ? "Detour Active" : "Clear",
      status: "completed",
      icon: Navigation
    },
    {
      id: "ev-6",
      title: isRescued ? "VICTIM RESCUED" : "RESCUE IN PROGRESS",
      desc: isRescued
        ? `Victim V-${targetVictim.id} successfully extricated by rescue personnel`
        : `Aerial intercept vector active. Est. arrival in ${estTime}`,
      time: isRescued ? "Completed" : "In Progress",
      status: isRescued ? "completed" : "active",
      icon: isRescued ? CheckCircle2 : Clock
    }
  ];

  return (
    <div className="panel event-feed-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={18} color="#22c55e" />
          <h3 style={{ margin: 0 }}>Real-Time Mission Event Feed</h3>
        </div>
        <span className="status-pill badge-assigned" style={{ fontSize: "11px" }}>
          {timestamp}
        </span>
      </div>

      <div className="event-timeline" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
        {events.map((ev, idx) => {
          const Icon = ev.icon;
          const isActive = ev.status === "active";
          const isCompleted = ev.status === "completed";

          return (
            <div
              key={ev.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                position: "relative"
              }}
            >
              {/* Dot & vertical connector line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: isActive ? "#3b82f6" : isCompleted ? "#065f46" : "#1f2937",
                    border: `2px solid ${isActive ? "#60a5fa" : isCompleted ? "#22c55e" : "#475569"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isActive ? "0 0 8px #3b82f6" : "none"
                  }}
                >
                  <Icon size={12} color={isActive ? "white" : isCompleted ? "#a7f3d0" : "#94a3b8"} />
                </div>
                {idx < events.length - 1 && (
                  <div
                    style={{
                      width: "2px",
                      height: "26px",
                      background: isCompleted ? "rgba(34, 197, 94, 0.4)" : "#334155",
                      marginTop: "2px"
                    }}
                  />
                )}
              </div>

              {/* Event Content */}
              <div style={{ flex: 1, paddingBottom: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                  <strong style={{ fontSize: "12px", color: isActive ? "#60a5fa" : "white", letterSpacing: "0.4px" }}>
                    {ev.title}
                  </strong>
                  <span
                    style={{
                      fontSize: "10px",
                      color: isActive ? "#93c5fd" : "#9ca3af",
                      background: isActive ? "rgba(59, 130, 246, 0.15)" : "#0b1120",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      border: `1px solid ${isActive ? "rgba(59, 130, 246, 0.3)" : "#1f2937"}`
                    }}
                  >
                    {ev.time}
                  </span>
                </div>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#cbd5e1", lineHeight: "1.3" }}>
                  {ev.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventFeed;
