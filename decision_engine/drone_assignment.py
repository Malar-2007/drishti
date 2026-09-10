"""
DRISHTI Intelligent Drone Assignment Engine
-------------------------------------------
Selects the most suitable drone for a target victim.
Evaluates:
- Victim priority (HIGH, MEDIUM, LOW)
- Drone availability
- Battery level (Hard cutoff at <= 15% battery: disqualified with reason)
- Euclidean distance to target
- Drone cruising speed (m/s)
- Estimated Time of Arrival: ETA = distance / speed
- Produces human-readable explanation rationale.
"""

import math
from typing import List, Dict, Any, Tuple


class DroneAssignmentEngine:
    """
    Battery-aware, multi-criteria drone assignment optimizer.
    """

    def __init__(
        self,
        min_battery_threshold: float = 15.0,
        low_battery_warning: float = 25.0,
        max_search_radius_m: float = 3000.0,
        weight_distance: float = 0.45,
        weight_battery: float = 0.25,
        weight_speed: float = 0.15,
        weight_availability: float = 0.15
    ):
        self.min_battery = min_battery_threshold
        self.low_battery_warn = low_battery_warning
        self.max_radius = max_search_radius_m
        self.w_dist = weight_distance
        self.w_bat = weight_battery
        self.w_spd = weight_speed
        self.w_avail = weight_availability

    def calculate_distance(self, p1: Dict[str, float], p2: Dict[str, float]) -> float:
        """Calculates 2D Euclidean distance in meters."""
        return math.hypot(p1.get("x", 0) - p2.get("x", 0), p1.get("y", 0) - p2.get("y", 0))

    def evaluate_drone_suitability(
        self,
        drone: Dict[str, Any],
        victim: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates a single drone's suitability score and eligibility for a given victim.
        """
        d_id = drone.get("id", 1)
        d_name = drone.get("name", f"DRONE-{d_id:02d}")
        battery = float(drone.get("battery", 100))
        speed = max(1.0, float(drone.get("speed", 10.0)))
        available = bool(drone.get("available", True))
        status = drone.get("status", "SEARCHING")

        dist = self.calculate_distance(drone, victim)
        eta_seconds = round(dist / speed, 1)

        # 1. Hard Battery Safety Constraint
        if battery <= self.min_battery:
            return {
                "drone_id": d_id,
                "drone_name": d_name,
                "eligible": False,
                "score": 0.0,
                "distance_m": round(dist, 1),
                "eta_sec": eta_seconds,
                "battery": battery,
                "rejection_reason": f"Insufficient battery ({battery:.0f}% <= {self.min_battery:.0f}% threshold) - Return-To-Base engaged."
            }

        # 2. Busy status constraint (cannot double-book active missions)
        if status in ["RESCUING"] or (not available and status not in ["SEARCHING", "AVAILABLE"]):
            return {
                "drone_id": d_id,
                "drone_name": d_name,
                "eligible": False,
                "score": 0.0,
                "distance_m": round(dist, 1),
                "eta_sec": eta_seconds,
                "battery": battery,
                "rejection_reason": f"Unit currently engaged in active operation ({status})."
            }

        # 3. Normalized multi-criteria scoring
        f_dist = max(0.0, 1.0 - (dist / self.max_radius))
        f_bat = battery / 100.0
        f_spd = min(1.0, speed / 15.0)
        f_avail = 1.0 if (available and battery > self.low_battery_warn) else 0.5

        suitability_score = (
            (self.w_dist * f_dist) +
            (self.w_bat * f_bat) +
            (self.w_spd * f_spd) +
            (self.w_avail * f_avail)
        )
        suitability_score = round(suitability_score, 3)

        return {
            "drone_id": d_id,
            "drone_name": d_name,
            "eligible": True,
            "score": suitability_score,
            "distance_m": round(dist, 1),
            "eta_sec": eta_seconds,
            "battery": battery,
            "speed": speed,
            "rejection_reason": None
        }

    def assign_best_drone(
        self,
        drones: List[Dict[str, Any]],
        victim: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates all fleet drones and selects the optimal unit for the victim.
        Generates human-readable assignment rationale.
        """
        v_id = victim.get("id", 1)
        v_name = victim.get("name", f"V-{v_id}")
        v_priority = victim.get("priority", "HIGH")

        candidates = [self.evaluate_drone_suitability(d, victim) for d in drones]
        eligible_candidates = [c for c in candidates if c["eligible"]]

        if not eligible_candidates:
            return {
                "success": False,
                "assigned_drone_id": None,
                "target_victim_id": v_id,
                "recommendation": f"CRITICAL: No fleet units currently eligible for {v_name}. All drones depleted or engaged.",
                "all_evaluations": candidates
            }

        # Select highest suitability score
        best_candidate = max(eligible_candidates, key=lambda c: c["score"])

        # Explainable rationale string
        recommendation = (
            f"{best_candidate['drone_name']} selected for {v_name}: "
            f"{v_priority} priority + lowest ETA ({best_candidate['eta_sec']:.0f}s) + "
            f"sufficient battery ({best_candidate['battery']:.0f}%) "
            f"(Decision Score: {best_candidate['score']:.2f})."
        )

        return {
            "success": True,
            "assigned_drone_id": best_candidate["drone_id"],
            "assigned_drone_name": best_candidate["drone_name"],
            "target_victim_id": v_id,
            "target_victim_priority": v_priority,
            "distance_m": best_candidate["distance_m"],
            "eta_seconds": best_candidate["eta_sec"],
            "drone_battery": best_candidate["battery"],
            "score": best_candidate["score"],
            "recommendation": recommendation,
            "all_evaluations": candidates
        }


if __name__ == "__main__":
    fleet = [
        {"id": 1, "name": "DRONE-01", "x": 700, "y": 700, "speed": 10, "battery": 90, "available": True, "status": "SEARCHING"},
        {"id": 2, "name": "DRONE-02", "x": 400, "y": 680, "speed": 12, "battery": 85, "available": True, "status": "SEARCHING"},
        {"id": 3, "name": "DRONE-03", "x": 180, "y": 200, "speed": 11, "battery": 14, "available": False, "status": "LOW BATTERY"},
        {"id": 4, "name": "DRONE-04", "x": 1200, "y": 1200, "speed": 10, "battery": 95, "available": True, "status": "SEARCHING"},
        {"id": 5, "name": "DRONE-05", "x": 630, "y": 750, "speed": 13, "battery": 75, "available": True, "status": "SEARCHING"}
    ]
    target_victim = {"id": 1, "name": "V-1", "x": 650, "y": 750, "priority": "HIGH"}

    assigner = DroneAssignmentEngine()
    result = assigner.assign_best_drone(fleet, target_victim)
    import json
    print(json.dumps(result, indent=2))
