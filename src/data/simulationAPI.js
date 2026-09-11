import {
  drones as defaultDrones,
  victims as defaultVictims,
  rescue as defaultRescue
} from "./simulationData";

let lastValidData = null;

export async function getSimulationData() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (apiUrl) {
      const apiUrl =
  import.meta.env.VITE_API_URL ||
  "https://drishti-dg9e.onrender.com";

const response = await fetch(
  `${apiUrl}/api/simulation-data?timestamp=${new Date().getTime()}`,
  { cache: "no-store" }
);
      

      if (response.ok) {
        const data = await response.json();

        if (
          data &&
          Array.isArray(data.drones) &&
          data.drones.length > 0 &&
          Array.isArray(data.victims) &&
          data.rescue
        ) {
          lastValidData = {
            ...data,
            isLive: true,
            lastFetchSuccess: Date.now()
          };

          return lastValidData;
        }
      }
    }

    const response = await fetch(
      `/data/rescue_results.json?timestamp=${new Date().getTime()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (
      data &&
      Array.isArray(data.drones) &&
      data.drones.length > 0 &&
      Array.isArray(data.victims) &&
      data.rescue
    ) {
      lastValidData = {
        ...data,
        isLive: true,
        lastFetchSuccess: Date.now()
      };

      return lastValidData;
    }

    throw new Error("Simulation JSON payload was incomplete");
  } catch (error) {
    console.warn(
      "Simulation API read warning (retaining cached data):",
      error.message
    );

    if (lastValidData) {
      return {
        ...lastValidData,
        isLive: false,
        warning: "Awaiting next simulation step sync..."
      };
    }

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
        recommendation:
          "DRONE-01 assigned to V-1: HIGH priority + shortest response time.",
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