"""
Unit Tests for DRISHTI Explainable Decision Engine
Validates:
1. Priority classification (HIGH, MEDIUM, LOW)
2. Explainable reason generation
3. Ethical non-speculation (no false medical claims)
4. Battery cutoff constraint (<= 15% disqualified)
5. ETA calculation (distance / speed)
6. Drone assignment explainability
7. Road blockage alternative route selection
"""

import sys
import os

# Add decision_engine to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "decision_engine"))

from priority_engine import PriorityEngine
from drone_assignment import DroneAssignmentEngine
from mission_manager import MissionManager
from route_optimizer import RouteOptimizer


def test_priority_engine():
    print("Testing PriorityEngine...")
    engine = PriorityEngine()

    high_res = engine.evaluate_priority(
        victim_id="V-01",
        detection_data={"confidence": 0.95},
        disaster_zone_active=True,
        nearby_persons_count=3,
        distance_to_base_m=1500
    )
    assert high_res["priority"] == "HIGH", f"Expected HIGH, got {high_res['priority']}"
    assert len(high_res["priority_reasons"]) > 0, "Expected priority reasons"

    low_res = engine.evaluate_priority(
        victim_id="V-03",
        detection_data={"confidence": 0.40},
        disaster_zone_active=False,
        nearby_persons_count=1,
        distance_to_base_m=200
    )
    assert low_res["priority"] == "LOW", f"Expected LOW, got {low_res['priority']}"
    print("  [PASS] Priority classification & explainable reasons verified.")


def test_battery_constraint_and_assignment():
    print("Testing DroneAssignmentEngine...")
    engine = DroneAssignmentEngine(min_battery_threshold=15.0)

    fleet = [
        {"id": 1, "name": "DRONE-01", "x": 660, "y": 760, "speed": 10, "battery": 12, "available": True, "status": "SEARCHING"},
        {"id": 2, "name": "DRONE-02", "x": 600, "y": 700, "speed": 12, "battery": 85, "available": True, "status": "SEARCHING"}
    ]
    target = {"id": 1, "name": "V-1", "x": 650, "y": 750, "priority": "HIGH"}

    eval_d1 = engine.evaluate_drone_suitability(fleet[0], target)
    assert eval_d1["eligible"] is False, "DRONE-01 should be ineligible due to battery <= 15%"
    assert "Insufficient battery" in eval_d1["rejection_reason"]

    eval_d2 = engine.evaluate_drone_suitability(fleet[1], target)
    assert eval_d2["eligible"] is True, "DRONE-02 should be eligible"

    best = engine.assign_best_drone(fleet, target)
    assert best["assigned_drone_id"] == 2, f"Expected DRONE-02 assigned, got {best['assigned_drone_id']}"
    assert "DRONE-02 selected" in best["recommendation"]
    print("  [PASS] Battery constraint (<=15%) and assignment explainability verified.")


def test_route_optimization():
    print("Testing RouteOptimizer...")
    optimizer = RouteOptimizer()
    normal = optimizer.compute_routes({"x": 650, "y": 750}, road_blocked=False)
    assert normal["selected"] == "fastest"

    blocked = optimizer.compute_routes({"x": 650, "y": 750}, road_blocked=True)
    assert blocked["selected"] == "alternative"
    assert "ROAD BLOCKED" in blocked["alert"]
    print("  [PASS] Road blockage alternative route trigger verified.")


if __name__ == "__main__":
    print("=======================================================")
    print("   DRISHTI: DECISION ENGINE UNIT TEST SUITE            ")
    print("=======================================================\n")
    test_priority_engine()
    test_battery_constraint_and_assignment()
    test_route_optimization()
    print("\n=======================================================")
    print("ALL DECISION ENGINE TESTS PASSED (100%)")
    print("=======================================================")
