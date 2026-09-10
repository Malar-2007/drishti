/**
 * DRISHTI Simulation Engine (Companion Runner)
 * 
 * Implements the exact kinematics, battery depletion, multi-criteria AI drone
 * scoring, victim priority ranking, road blockage, ground routes, and JSON generation
 * as matlab/drishti_simulation.m.
 * 
 * Usage:
 *   node scripts/simulate.js          (continuous simulation, 1.5s loop)
 *   node scripts/simulate.js --once   (single step run for testing)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const outputDir = path.join(projectRoot, 'public', 'data');
const outputFile = path.join(outputDir, 'rescue_results.json');
const tempFile = path.join(outputDir, 'rescue_results_temp.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Simulation parameters
const dt = 1.0;
const loopDelay = 1500; // ms
const maxDistance = 3000; // m
const maxSpeed = 15; // m/s
const batteryLowThreshold = 25; // %
const batteryCriticalThreshold = 15; // %

// AI scoring weights
const w_dist = 0.45;
const w_battery = 0.25;
const w_speed = 0.15;
const w_avail = 0.15;

// Fleet initial state
let drones = [
  { id: 1, name: 'DRONE-01', x: 700, y: 700, altitude: 100, speed: 10, battery: 90, available: true, status: 'SEARCHING', vx: 6, vy: 5 },
  { id: 2, name: 'DRONE-02', x: -420, y: 1120, altitude: 100, speed: 12, battery: 85, available: true, status: 'SEARCHING', vx: -5, vy: 6 },
  { id: 3, name: 'DRONE-03', x: 1160, y: -460, altitude: 100, speed: 11, battery: 80, available: true, status: 'SEARCHING', vx: 7, vy: -4 },
  { id: 4, name: 'DRONE-04', x: 100, y: 0, altitude: 100, speed: 10, battery: 95, available: true, status: 'SEARCHING', vx: 4, vy: 8 },
  { id: 5, name: 'DRONE-05', x: 980, y: 1480, altitude: 100, speed: 13, battery: 75, available: true, status: 'SEARCHING', vx: -6, vy: -5 }
];

let victims = [
  { id: 1, name: 'V-1', x: 650, y: 750, priority: 'HIGH', detected: true, status: 'DETECTED', assignedDrone: 0, rescueTimer: 0 },
  { id: 2, name: 'V-2', x: 250, y: 450, priority: 'MEDIUM', detected: true, status: 'DETECTED', assignedDrone: 0, rescueTimer: 0 },
  { id: 3, name: 'V-3', x: 800, y: 250, priority: 'LOW', detected: true, status: 'DETECTED', assignedDrone: 0, rescueTimer: 0 }
];

const rescueTeam = { x: 500, y: 500, name: 'RESCUE TEAM 01' };

let step = 0;
const blockageStep = 18;
let roadBlocked = false;
let rescuedCount = 0;

function simulateStep() {
  step += 1;
  const now = new Date();
  const timestamp = now.toLocaleTimeString();

  // 1. Dynamic Victim Triage Queue (Prioritize unrescued HIGH -> MEDIUM -> LOW)
  let targetVictim = victims.find(v => v.status === 'ASSIGNED');
  if (!targetVictim) {
    targetVictim = victims.find(v => v.priority === 'HIGH' && v.status !== 'RESCUED')
      || victims.find(v => v.priority === 'MEDIUM' && v.status !== 'RESCUED')
      || victims.find(v => v.priority === 'LOW' && v.status !== 'RESCUED')
      || victims[0];
    targetVictim.status = 'ASSIGNED';
  }

  const activeMissionId = `M-${String(targetVictim.id).padStart(3, '0')}`;

  // 2. Multi-criteria AI drone scoring algorithm
  let bestDroneIdx = 0;
  let highestScore = -Infinity;
  const scores = [];

  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    const dist = Math.hypot(d.x - targetVictim.x, d.y - targetVictim.y);

    const f_dist = Math.max(0, 1 - dist / maxDistance);
    const f_bat = d.battery / 100;
    const f_speed = d.speed / maxSpeed;
    const f_avail = d.available && d.battery > batteryLowThreshold ? 1 : 0;

    let score = (w_dist * f_dist) + (w_battery * f_bat) + (w_speed * f_speed) + (w_avail * f_avail);
    if (d.battery <= batteryCriticalThreshold) score *= 0.05;

    scores.push(parseFloat(score.toFixed(3)));

    if (score > highestScore) {
      highestScore = score;
      bestDroneIdx = i;
    }
  }

  const assignedDrone = drones[bestDroneIdx];
  targetVictim.assignedDrone = assignedDrone.id;

  // 3. Drone Kinematics & Mission Progression
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];

    if (i === bestDroneIdx && targetVictim.status !== 'RESCUED') {
      const dx = targetVictim.x - d.x;
      const dy = targetVictim.y - d.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        d.x += (dx / dist) * d.speed * dt;
        d.y += (dy / dist) * d.speed * dt;
        d.status = 'ASSIGNED';
      } else {
        d.status = 'RESCUING';
        targetVictim.rescueTimer = (targetVictim.rescueTimer || 0) + 1;
        if (targetVictim.rescueTimer >= 5) {
          targetVictim.status = 'RESCUED';
          rescuedCount += 1;
        }
      }
    } else if (d.battery <= batteryCriticalThreshold) {
      d.status = 'LOW BATTERY';
      d.available = false;
      const dx = rescueTeam.x - d.x;
      const dy = rescueTeam.y - d.y;
      const distBase = Math.hypot(dx, dy);
      if (distBase > 20) {
        d.x += (dx / distBase) * (d.speed * 0.7) * dt;
        d.y += (dy / distBase) * (d.speed * 0.7) * dt;
      }
    } else if (d.available) {
      d.status = 'SEARCHING';
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      if (d.x > 1500 || d.x < -600) d.vx = -d.vx;
      if (d.y > 1600 || d.y < -600) d.vy = -d.vy;
    }

    // Battery depletion
    let drainRate = 0.05 + (d.speed / 20) * 0.08;
    if (d.status === 'RESCUING') drainRate += 0.08;
    d.battery = Math.max(0, parseFloat((d.battery - drainRate).toFixed(1)));
    if (d.battery <= batteryCriticalThreshold) d.available = false;
  }

  const assignedDistance = Math.hypot(assignedDrone.x - targetVictim.x, assignedDrone.y - targetVictim.y);
  const estArrivalSec = Math.round(assignedDistance / Math.max(assignedDrone.speed, 1));

  // 4. Road blockage simulation & ground route calculation
  roadBlocked = (step >= blockageStep && step < blockageStep + 25);
  const selectedRouteName = roadBlocked ? 'alternative' : 'fastest';

  // 5. Decision Support Rationale
  const decisionRationale = `${assignedDrone.name} selected for ${targetVictim.name}: ${targetVictim.priority} priority + est. response time ${estArrivalSec}s + battery ${assignedDrone.battery}% (AI Score: ${highestScore.toFixed(2)})`;

  // 6. Dynamic Alerts
  const alerts = [];
  if (targetVictim.status === 'RESCUED') {
    alerts.push({
      type: 'INFO',
      title: `${targetVictim.name} RESCUED`,
      message: `Victim ${targetVictim.name} extricated and safely transferred to medical transit.`,
      time: 'Just now'
    });
  } else {
    alerts.push({
      type: 'HIGH',
      title: 'HIGH PRIORITY VICTIM DETECTED',
      message: `Victim ${targetVictim.name} located at (${targetVictim.x}, ${targetVictim.y}). Immediate response initiated.`,
      time: 'Just now'
    });
  }

  alerts.push({
    type: 'INFO',
    title: `${assignedDrone.name} ASSIGNED`,
    message: `${assignedDrone.name} navigating to Victim ${targetVictim.name}. Distance: ${assignedDistance.toFixed(1)}m.`,
    time: 'Live'
  });

  if (roadBlocked) {
    alerts.push({
      type: 'HIGH',
      title: 'ROAD BLOCKED',
      message: 'Primary arterial road obstructed. Dynamic alternative corridor calculated.',
      time: 'Just now'
    });
  } else {
    alerts.push({
      type: 'INFO',
      title: 'ROAD CONDITION MONITORED',
      message: 'Ground rescue routes are clear and accessible.',
      time: '1 min ago'
    });
  }

  for (const d of drones) {
    if (d.battery < batteryLowThreshold) {
      alerts.push({
        type: 'WARNING',
        title: `${d.name} LOW BATTERY`,
        message: `${d.name} battery at ${d.battery}%. Return-to-base protocol standby.`,
        time: 'Active'
      });
    }
  }

  // 7. Complete JSON structure (backward-compatible + extended)
  const outputData = {
    drones: drones.map(d => ({
      id: d.id,
      name: d.name,
      x: Math.round(d.x * 10) / 10,
      y: Math.round(d.y * 10) / 10,
      altitude: d.altitude,
      speed: d.speed,
      battery: d.battery,
      available: d.available,
      status: d.status
    })),
    victims: victims.map(v => ({
      id: v.id,
      name: v.name,
      x: v.x,
      y: v.y,
      priority: v.priority,
      status: v.status,
      assignedDrone: v.assignedDrone
    })),
    rescue: {
      target_victim: targetVictim.id,
      priority: targetVictim.priority,
      assigned_drone: assignedDrone.id,
      distance: parseFloat(assignedDistance.toFixed(2)),
      battery: assignedDrone.battery
    },
    decision_support: {
      selected_drone_id: assignedDrone.id,
      target_victim_id: targetVictim.id,
      recommendation: decisionRationale,
      scores: scores,
      estimated_arrival_sec: estArrivalSec,
      road_blocked: roadBlocked,
      selected_ground_route: selectedRouteName,
      step: step,
      timestamp: timestamp
    },
    mission: {
      id: activeMissionId,
      status: targetVictim.status,
      targetVictim: targetVictim.id,
      assignedDrone: assignedDrone.id,
      estTime: `${estArrivalSec} sec`,
      distance: `${assignedDistance.toFixed(1)} m`
    },
    routes: {
      selected: selectedRouteName,
      road_blocked: roadBlocked,
      shortest_distance: '1.8 km',
      shortest_time: '8 min',
      fastest_distance: '2.4 km',
      fastest_time: '6 min',
      alternative_distance: '3.1 km',
      alternative_time: '11 min'
    },
    analytics: {
      rescued_count: rescuedCount,
      active_missions: 1,
      avg_response_time: `${estArrivalSec} sec`,
      success_rate: '98%'
    },
    road_blocked: roadBlocked,
    alerts: alerts,
    simulation_step: step,
    timestamp: timestamp
  };

  // 8. Atomic safe file write (Guaranteed reliable backup)
  const jsonStr = JSON.stringify(outputData, null, 2);
  fs.writeFileSync(tempFile, jsonStr, 'utf-8');
  fs.renameSync(tempFile, outputFile);

  // 9. Real-Time Push to Backend API & WebSocket Broadcaster (if active)
  try {
    fetch('http://localhost:5000/api/simulation-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr
    }).catch(() => {
      // Backend not running; file write backup remains active
    });
  } catch (e) {
    // ignore
  }

  console.log(`[Step ${String(step).padStart(3, '0')} | ${timestamp}] Assigned: ${assignedDrone.name} -> ${targetVictim.name} (${assignedDistance.toFixed(1)}m, Bat: ${assignedDrone.battery}%) | Blocked: ${roadBlocked} | Rescued: ${rescuedCount}`);
}

const isOnce = process.argv.includes('--once');

if (isOnce) {
  simulateStep();
  console.log('Single simulation step complete. File written to: ' + outputFile);
  process.exit(0);
} else {
  console.log('=======================================================');
  console.log('   DRISHTI: AI-POWERED MULTI-DRONE SIMULATION RUNNER   ');
  console.log('=======================================================');
  console.log(`Writing simulation results to: ${outputFile}`);
  console.log('Press Ctrl+C to stop.\n');

  simulateStep();
  setInterval(simulateStep, loopDelay);
}
