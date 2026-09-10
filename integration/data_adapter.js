/**
 * DRISHTI Data Adapter
 * --------------------
 * Validates, sanitizes, and normalizes telemetry data originating from:
 * - MATLAB Simulation Engine
 * - Computer Vision & YOLO Detector
 * - Decision Support Engine
 *
 * Ensures backward and forward compatibility with existing React components:
 * - Dashboard.jsx
 * - LiveMap.jsx
 * - RoutePlanner.jsx
 * - AlertsPanel.jsx
 * - AnalyticsPanel.jsx
 */

export function validateAndNormalizePayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Invalid payload: expected an object');
  }

  // 1. Ensure drones array is valid
  const drones = Array.isArray(rawPayload.drones)
    ? rawPayload.drones.map((d, idx) => ({
        id: d.id || idx + 1,
        name: d.name || `DRONE-${String(d.id || idx + 1).padStart(2, '0')}`,
        x: Number(d.x) || 0,
        y: Number(d.y) || 0,
        altitude: Number(d.altitude) || 100,
        speed: Number(d.speed) || 10,
        battery: Math.min(100, Math.max(0, Number(d.battery) || 0)),
        available: Boolean(d.available && Number(d.battery) > 15),
        status: d.status || (Number(d.battery) <= 15 ? 'LOW BATTERY' : 'SEARCHING')
      }))
    : [];

  // 2. Ensure victims array is valid
  const victims = Array.isArray(rawPayload.victims)
    ? rawPayload.victims.map((v, idx) => ({
        id: v.id || idx + 1,
        name: v.name || `V-${v.id || idx + 1}`,
        x: Number(v.x) || 650,
        y: Number(v.y) || 750,
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(String(v.priority).toUpperCase())
          ? String(v.priority).toUpperCase()
          : 'MEDIUM',
        status: v.status || 'DETECTED',
        assignedDrone: v.assignedDrone || 0
      }))
    : [];

  // 3. Normalized rescue target object
  const rescue = {
    target_victim: rawPayload.rescue?.target_victim || victims[0]?.id || 1,
    priority: rawPayload.rescue?.priority || victims[0]?.priority || 'HIGH',
    assigned_drone: rawPayload.rescue?.assigned_drone || 1,
    distance: Number(rawPayload.rescue?.distance) || 70.7,
    battery: Number(rawPayload.rescue?.battery) || 90
  };

  // 4. Ground corridors
  const routes = {
    selected: rawPayload.routes?.selected || (rawPayload.road_blocked ? 'alternative' : 'fastest'),
    road_blocked: Boolean(rawPayload.road_blocked),
    shortest_distance: rawPayload.routes?.shortest_distance || '1.8 km',
    shortest_time: rawPayload.routes?.shortest_time || '8 min',
    fastest_distance: rawPayload.routes?.fastest_distance || '2.4 km',
    fastest_time: rawPayload.routes?.fastest_time || '6 min',
    alternative_distance: rawPayload.routes?.alternative_distance || '3.1 km',
    alternative_time: rawPayload.routes?.alternative_time || '11 min'
  };

  return {
    ...rawPayload,
    drones,
    victims,
    rescue,
    routes,
    road_blocked: routes.road_blocked,
    timestamp: rawPayload.timestamp || new Date().toLocaleTimeString()
  };
}
