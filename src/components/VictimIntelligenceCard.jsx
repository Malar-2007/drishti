import React, { useState } from "react";
import { Users, AlertTriangle, ShieldAlert, Award, Crosshair, CheckCircle2, ChevronRight, MapPin } from "lucide-react";

/**
 * DRISHTI Explainable Victim Priority Intelligence Card
 * -----------------------------------------------------
 * Displays:
 * - Victim ID (e.g. V-1)
 * - Priority Level (HIGH, MEDIUM, LOW)
 * - Priority Score (e.g. 87 / 100)
 * - Detection Confidence (e.g. 93.4%)
 * - Hazard-zone status (e.g. Active Hazard Zone)
 * - Human-readable explanation for priority
 */
function VictimIntelligenceCard({
  victims = [],
  targetVictimId = 1,
  rescue = {},
  simulationData = null
}) {
  const [selectedId, setSelectedId] = useState(null);

  // Default to rescue target victim or first victim in list
  const activeVictimId = selectedId || targetVictimId || rescue?.target_victim || (victims[0]?.id) || 1;
  const victim = victims.find(v => v.id === activeVictimId) || victims[0] || {
    id: 1,
    name: "V-1",
    x: 650,
    y: 750,
    priority: "HIGH",
    status: "ASSIGNED"
  };

  // Determine Priority Score
  let score = victim.priority_score;
  if (typeof score !== "number") {
    switch (String(victim.priority || "").toUpperCase()) {
      case "HIGH":
        score = 87;
        break;
      case "MEDIUM":
        score = 58;
        break;
      case "LOW":
        score = 32;
        break;
      default:
        score = 50;
    }
  }

  // Determine Detection Confidence
  const confidenceVal = victim.confidence ?? (victim.priority === "HIGH" ? 0.934 : victim.priority === "MEDIUM" ? 0.887 : 0.742);
  const confidencePct = Math.round(Number(confidenceVal) * 100);

  // Determine Hazard Zone Status
  let hazardZone = victim.hazard_zone_status || victim.hazard_zone;
  if (!hazardZone) {
    if (victim.priority === "HIGH") {
      hazardZone = "Active Hazard Zone (Sector Bravo)";
    } else if (victim.priority === "MEDIUM") {
      hazardZone = "Hazard Perimeter (Sector Alpha)";
    } else {
      hazardZone = "Stable Ingress Margin";
    }
  }

  // Determine Human-Readable Priority Reason
  let reason = "";
  if (Array.isArray(victim.priority_reasons) && victim.priority_reasons.length > 0) {
    reason = victim.priority_reasons.join(". ");
  } else if (typeof victim.priority_reason === "string" && victim.priority_reason) {
    reason = victim.priority_reason;
  } else {
    switch (String(victim.priority || "").toUpperCase()) {
      case "HIGH":
        reason = "High-confidence person detection in active hazard zone.";
        break;
      case "MEDIUM":
        reason = "Person detected near hazard perimeter with moderate environmental exposure.";
        break;
      case "LOW":
        reason = "Detection located in stable sector outside immediate hazard flow.";
        break;
      default:
        reason = "Standard baseline casualty monitoring priority assigned.";
    }
  }

  const getPriorityColor = (p) => {
    switch (String(p).toUpperCase()) {
      case "HIGH": return "#ef4444";
      case "MEDIUM": return "#f59e0b";
      case "LOW": return "#22c55e";
      default: return "#9ca3af";
    }
  };

  const priorityColor = getPriorityColor(victim.priority);

  return (
    <div className="panel victim-intel-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Users size={18} color="#ef4444" />
          <h3 style={{ margin: 0 }}>Explainable Victim Priority Intelligence</h3>
        </div>

        {/* Casualty Selector Chips */}
        <div style={{ display: "flex", gap: "4px" }}>
          {victims.map(v => {
            const isSelected = v.id === victim.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                style={{
                  background: isSelected ? "#1e293b" : "#0b1120",
                  border: `1px solid ${isSelected ? priorityColor : "#1f2937"}`,
                  color: isSelected ? "white" : "#9ca3af",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                V-{v.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* PRIMARY VICTIM CARD OVERVIEW */}
      <div
        style={{
          background: "#0b1120",
          border: `1px solid ${priorityColor}33`,
          borderRadius: "8px",
          padding: "12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px"
        }}
      >
        <div>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "2px" }}>Victim Identifier</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <strong style={{ fontSize: "16px", color: "white" }}>V-{victim.id}</strong>
            <span
              className="status-pill"
              style={{
                background: `${priorityColor}20`,
                color: priorityColor,
                border: `1px solid ${priorityColor}40`,
                fontSize: "11px",
                fontWeight: "bold",
                padding: "2px 6px"
              }}
            >
              {victim.priority || "HIGH"}
            </span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "2px" }}>Priority Score</label>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <strong style={{ fontSize: "20px", color: priorityColor }}>{score}</strong>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>/ 100</span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "2px" }}>Detection Confidence</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Crosshair size={14} color="#22c55e" />
            <strong style={{ fontSize: "13px", color: "#22c55e" }}>{confidencePct}%</strong>
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "2px" }}>Hazard-Zone Status</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldAlert size={14} color={victim.priority === "HIGH" ? "#ef4444" : "#f59e0b"} />
            <strong style={{ fontSize: "12px", color: "#e2e8f0" }}>{hazardZone}</strong>
          </div>
        </div>
      </div>

      {/* EXPLAINABLE REASON CALLOUT */}
      <div
        style={{
          marginTop: "12px",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))",
          borderLeft: `3px solid ${priorityColor}`,
          borderRadius: "6px",
          padding: "10px 12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <Award size={14} color={priorityColor} />
          <strong style={{ fontSize: "11px", color: priorityColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Reason for Priority
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "#f1f5f9", lineHeight: "1.4", fontWeight: 500 }}>
          "{reason}"
        </p>
      </div>

      {/* EXPLAINABILITY TRANSPARENCY CRITERIA */}
      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", background: "#0b1120", padding: "8px 10px", borderRadius: "6px", border: "1px solid #1f2937" }}>
        <span>Coordinates: ({victim.x}, {victim.y})</span>
        <span>Status: <strong style={{ color: victim.status === "RESCUED" ? "#22c55e" : "#60a5fa" }}>{victim.status || "DETECTED"}</strong></span>
      </div>
    </div>
  );
}

export default VictimIntelligenceCard;
