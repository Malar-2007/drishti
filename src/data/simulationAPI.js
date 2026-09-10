import { drones as defaultDrones, victims as defaultVictims, rescue as defaultRescue } from "./simulationData";

let lastValidData = null;

export async function getSimulationData() {
  try {
    const response = await fetch(
      `/data/rescue_results.json?timestamp=${new Date().getTime()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: Failed to load simulation data`);
    }

    const data = await response.json();

    // Basic structure validation to guard against half-written files
    if (data && Array.isArray(data.drones) && data.drones.length > 0 && Array.isArray(data.victims) && data.rescue) {
      lastValidData = {
        ...data,
        isLive: true,
        lastFetchSuccess: Date.now()
      };
      return lastValidData;
    } else {
      throw new Error("Simulation JSON payload was incomplete or malformed");
    }
  } catch (error) {
    console.warn("Simulation API read warning (retaining cached data):", error.message);

    if (lastValidData) {
      return {
        ...lastValidData,
        isLive: false,
        warning: "Awaiting next simulation step sync..."
      };
    }

    // Initial fallback if file has not yet been fetched
    return {
      drones: defaultDrones,
      victims: defaultVictims,
      rescue: {
        target_victim: defaultRescue.targetVictim,
        priority: defaultRescue.priority,
        assigned_drone: defaultRescue.assignedDrone,
        distance: defaultRescue.distance,
        battery: defaultRescue.battery
      },
      decision_support: {
        selected_drone_id: 1,
        target_victim_id: 1,
        recommendation: "DRONE-01 assigned to V-1: HIGH priority + shortest response time.",
        scores: [0.9, 0.75, 0.7, 0.8, 0.78],
        estimated_arrival_sec: 7,
        road_blocked: false,
        selected_ground_route: "fastest"
      },
      mission: {
        id: "M-001",
        status: "IN PROGRESS",
        targetVictim: 1,
        assignedDrone: 1,
        estTime: "7 sec",
        distance: "70.7 m"
      },
      road_blocked: false,
      isLive: false,
      isFallback: true
    };
  }
}