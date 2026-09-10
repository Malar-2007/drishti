export const drones = [
  {
    id: 1,
    name: "DRONE-01",
    x: 700,
    y: 700,
    altitude: 100,
    speed: 10,
    battery: 90,
    available: true,
    status: "SEARCHING"
  },
  {
    id: 2,
    name: "DRONE-02",
    x: -420,
    y: 1120,
    altitude: 100,
    speed: 12,
    battery: 85,
    available: true,
    status: "SEARCHING"
  },
  {
    id: 3,
    name: "DRONE-03",
    x: 1160,
    y: -460,
    altitude: 100,
    speed: 11,
    battery: 80,
    available: true,
    status: "SEARCHING"
  },
  {
    id: 4,
    name: "DRONE-04",
    x: 100,
    y: 0,
    altitude: 100,
    speed: 10,
    battery: 95,
    available: true,
    status: "SEARCHING"
  },
  {
    id: 5,
    name: "DRONE-05",
    x: 980,
    y: 1480,
    altitude: 100,
    speed: 13,
    battery: 75,
    available: true,
    status: "SEARCHING"
  }
];

export const victims = [
  {
    id: 1,
    x: 650,
    y: 750,
    priority: "HIGH"
  },
  {
    id: 2,
    x: 250,
    y: 450,
    priority: "MEDIUM"
  },
  {
    id: 3,
    x: 800,
    y: 250,
    priority: "LOW"
  }
];

export const rescue = {
  targetVictim: 1,
  priority: "HIGH",
  assignedDrone: 1,
  distance: 70.71,
  battery: 90
};
export const rescueTeam = {
  id: 1,
  name: "RESCUE TEAM 01",
  x: 500,
  y: 500,
  status: "READY"
};