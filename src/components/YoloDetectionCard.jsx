import React from "react";
import { Camera, Eye, ShieldCheck, Crosshair, CheckCircle2, Clock, Cpu, Image as ImageIcon } from "lucide-react";

/**
 * Live Drone Camera & YOLOv8 Person Detection Component
 * -----------------------------------------------------
 * Displays aerial computer vision feed telemetry:
 * - Source Drone ID
 * - Detected Entity: PERSON DETECTION
 * - Bounding Box Coordinates [x1, y1, x2, y2]
 * - YOLO Confidence Score
 * - Detection Timestamp
 * - Detection image/frame if available
 *
 * ETHICAL SAFEGUARD:
 * Strictly labeled as PERSON DETECTION. Does NOT claim that YOLO diagnoses medical conditions.
 */
function YoloDetectionCard({ detectionData = null, assignedDroneId = 2, targetVictim = null, simulationData = null }) {
  // Extract active detection from props, simulationData, or deterministic fallback
  const activeDetection = detectionData
    || simulationData?.detections?.[0]
    || simulationData?.detection
    || null;

  const sourceDrone = activeDetection?.source_drone
    || (simulationData?.rescue?.assigned_drone)
    || assignedDroneId
    || 2;

  const confidence = activeDetection?.confidence ?? 0.934;
  const confidencePct = Math.round(Number(confidence) * 100);

  const bbox = activeDetection?.bbox || [140.5, 210.0, 230.2, 415.8];
  const bboxStr = Array.isArray(bbox)
    ? `[${bbox.map(n => Math.round(n)).join(", ")}]`
    : "[140, 210, 230, 415]";

  const timestamp = activeDetection?.timestamp
    || simulationData?.timestamp
    || new Date().toLocaleTimeString();

  const imageSrc = activeDetection?.image_url
    || activeDetection?.image_frame
    || activeDetection?.image_path
    || null;

  return (
    <div className="panel yolo-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Camera size={18} color="#3b82f6" />
          <h3 style={{ margin: 0 }}>Live Drone Camera & YOLO Detections</h3>
        </div>
        <span className="status-pill badge-assigned" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
          YOLOv8 ACTIVE
        </span>
      </div>

      {/* AERIAL HUD / OPTICAL VIEWPORT SIMULATOR */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "190px",
          background: imageSrc ? `url(${imageSrc}) center/cover no-repeat` : "radial-gradient(circle, #1e293b 0%, #0f172a 100%)",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #334155",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "4px"
        }}
      >
        {/* HUD Grid Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none"
          }}
        />

        {/* Center Optical Crosshair */}
        <div style={{ position: "absolute", opacity: 0.35, pointerEvents: "none" }}>
          <Crosshair size={44} color="#60a5fa" />
        </div>

        {/* Top-Left Camera Telemetry */}
        <div style={{ position: "absolute", top: "8px", left: "10px", fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", pointerEvents: "none" }}>
          <div>CAM-FEED: DRONE-{String(sourceDrone).padStart(2, "0")}</div>
          <div>MODE: 4K OPTICAL FLIR</div>
          <div>RES: 1920x1080 @ 30FPS</div>
        </div>

        {/* Top-Right Model Classification Badge */}
        <div style={{ position: "absolute", top: "8px", right: "10px", fontSize: "10px", color: "#22c55e", fontFamily: "monospace", fontWeight: "bold", background: "rgba(15, 23, 42, 0.75)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
          TARGET: PERSON DETECTION
        </div>

        {/* Bounding Box Visualizer */}
        <div
          style={{
            width: "88px",
            height: "120px",
            border: "2px solid #22c55e",
            borderRadius: "4px",
            boxShadow: "0 0 14px rgba(34, 197, 94, 0.4)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "4px",
            background: "rgba(34, 197, 94, 0.05)"
          }}
        >
          <div
            style={{
              background: "#22c55e",
              color: "#0f172a",
              fontSize: "9px",
              fontWeight: "bold",
              padding: "2px 4px",
              borderRadius: "2px",
              alignSelf: "flex-start",
              fontFamily: "monospace"
            }}
          >
            person {confidencePct}%
          </div>
          <div style={{ fontSize: "10px", color: "#86efac", textAlign: "center", fontFamily: "monospace", fontWeight: "bold", textShadow: "0 1px 3px black" }}>
            V-{targetVictim?.id || simulationData?.rescue?.target_victim || 1}
          </div>
        </div>

        {/* Bottom Status bar */}
        <div
          style={{
            position: "absolute",
            bottom: "6px",
            left: "10px",
            right: "10px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#94a3b8",
            fontFamily: "monospace",
            background: "rgba(15, 23, 42, 0.8)",
            padding: "2px 6px",
            borderRadius: "3px"
          }}
        >
          <span>BBOX: {bboxStr}</span>
          <span>TIME: {timestamp}</span>
        </div>
      </div>

      {/* METRIC GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
        <div style={{ background: "#0b1120", padding: "8px 10px", borderRadius: "6px", border: "1px solid #1f2937" }}>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block" }}>Source Drone</label>
          <strong style={{ fontSize: "13px", color: "#60a5fa" }}>
            DRONE-{String(sourceDrone).padStart(2, "0")}
          </strong>
        </div>

        <div style={{ background: "#0b1120", padding: "8px 10px", borderRadius: "6px", border: "1px solid #1f2937" }}>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block" }}>Detection Target</label>
          <strong style={{ fontSize: "13px", color: "#22c55e" }}>PERSON DETECTION</strong>
        </div>

        <div style={{ background: "#0b1120", padding: "8px 10px", borderRadius: "6px", border: "1px solid #1f2937" }}>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block" }}>YOLO Confidence</label>
          <strong style={{ fontSize: "13px", color: "#22c55e" }}>{confidencePct}% ({confidence})</strong>
        </div>

        <div style={{ background: "#0b1120", padding: "8px 10px", borderRadius: "6px", border: "1px solid #1f2937" }}>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block" }}>Detection Timestamp</label>
          <strong style={{ fontSize: "12px", color: "#e2e8f0" }}>{timestamp}</strong>
        </div>
      </div>

      {/* ETHICAL DISCLAIMER CALLOUT */}
      <div
        style={{
          background: "rgba(30, 41, 59, 0.6)",
          borderRadius: "6px",
          padding: "8px 10px",
          marginTop: "10px",
          fontSize: "11px",
          color: "#94a3b8",
          borderLeft: "3px solid #3b82f6",
          lineHeight: "1.4"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#93c5fd", fontWeight: "bold", marginBottom: "2px" }}>
          <ShieldCheck size={13} />
          <span>ETHICAL VISION SAFEGUARD:</span>
        </div>
        YOLO strictly recognizes visual person geometry. It does NOT speculate or diagnose medical conditions (e.g. unconsciousness, bleeding, fractures). Operational urgency is assessed downstream by the Explainable Decision Engine.
      </div>
    </div>
  );
}

export default YoloDetectionCard;
