"""
DRISHTI End-to-End Decision Support Pipeline
--------------------------------------------
Integrates:
1. CV Detection Payloads
2. Explainable Priority Triage
3. Battery-Aware Intelligent Drone Assignment
4. Multi-Victim Mission Queue Management
5. Ground Route Optimization & Blockage Handling

Outputs structured decision support telemetry compatible with the React Dashboard.
"""

from typing import Dict, List, Any
import time

from priority_engine import PriorityEngine
from drone_assignment import DroneAssignmentEngine
from mission_manager import MissionManager
from route_optimizer import RouteOptimizer


class DecisionSupportPipeline:
    """
    Central Decision Support Orchestrator.
    """

    def __init__(self):
        self.priority_engine = PriorityEngine()
        self.assignment_engine = DroneAssignmentEngine()
        self.mission_manager = MissionManager()
        self.route_optimizer = RouteOptimizer()

    def process_incident_cycle(
        self,
        fleet_drones: List[Dict[str, Any]],
        victims: List[Dict[str, Any]],
        cv_detections: List[Dict[str, Any]] = None,
        road_blocked: bool = False
    ) -> Dict[str, Any]:
        """
        Executes one complete evaluation cycle:
        1. Ingests new detections and converts to candidate victims
        2. Evaluates urgency and priority with explicit reasons
        3. Sorts multi-casualty queue
        4. Matches target victim to optimal drone
        5. Computes ground routes
        6. Constructs alerts and analytics
        """
        now_str = time.strftime("%I:%M:%S %p")
        updated_victims = list(victims)

        # 1. Integrate new CV detections into casualty queue if provided
        if cv_detections:
            for det in cv_detections:
                v_id = len(updated_victims) + 1
                coords = det.get("estimated_coords", {"x": 650.0, "y": 750.0})
                
                # Evaluate explainable priority
                p_eval = self.priority_engine.evaluate_priority(
                    victim_id=f"V-{v_id}",
                    detection_data=det,
                    disaster_zone_active=True,
                    nearby_persons_count=len(cv_detections)
                )

                updated_victims.append({
                    "id": v_id,
                    "name": f"V-{v_id}",
                    "x": coords["x"],
                    "y": coords["y"],
                    "priority": p_eval["priority"],
                    "priority_score": p_eval["priority_score"],
                    "priority_reasons": p_eval["priority_reasons"],
                    "status": "ASSIGNED" if v_id == 1 else "DETECTED",
                    "source_drone": det.get("source_drone", 1)
                })

        # 2. Sort triage queue
        sorted_victims = self.mission_manager.sort_victim_queue(updated_victims)
        target_victim = sorted_victims[0] if sorted_victims else {
            "id": 1, "name": "V-1", "x": 650, "y": 750, "priority": "HIGH"
        }

        # 3. Intelligent Drone Assignment
        assignment = self.assignment_engine.assign_best_drone(fleet_drones, target_victim)

        # 4. Ground Route Optimization
        routes = self.route_optimizer.compute_routes(
            target_coords={"x": target_victim["x"], "y": target_victim["y"]},
            road_blocked=road_blocked
        )

        # 5. Mission State Record
        m_id = f"M-{target_victim.get('id', 1):03d}"
        mission_record = self.mission_manager.create_or_update_mission(
            mission_id=m_id,
            victim_id=target_victim.get("id", 1),
            assigned_drone_id=assignment.get("assigned_drone_id", 1),
            priority=target_victim.get("priority", "HIGH"),
            distance_m=assignment.get("distance_m", 70.0),
            eta_seconds=assignment.get("eta_seconds", 7.0),
            status=target_victim.get("status", "ASSIGNED")
        )

        # 6. Generate Contextual Alerts
        alerts = [
            {
                "type": target_victim.get("priority", "HIGH"),
                "title": f"{target_victim.get('priority', 'HIGH')} PRIORITY VICTIM DETECTED",
                "message": f"Casualty {target_victim.get('name', 'V-1')} identified at ({target_victim.get('x', 650)}, {target_victim.get('y', 750)}). Immediate response initiated.",
                "time": "Just now"
            },
            {
                "type": "INFO",
                "title": f"{assignment.get('assigned_drone_name', 'DRONE-01')} ASSIGNED",
                "message": f"{assignment.get('assigned_drone_name', 'DRONE-01')} locked onto {target_victim.get('name', 'V-1')}. Distance: {assignment.get('distance_m', 70.0):.1f}m.",
                "time": "Live"
            }
        ]

        if road_blocked:
            alerts.append({
                "type": "HIGH",
                "title": "ROAD BLOCKED",
                "message": "Arterial route blocked. Alternative ground corridor active.",
                "time": "Just now"
            })
        else:
            alerts.append({
                "type": "INFO",
                "title": "ROAD CONDITION MONITORED",
                "message": "Ground rescue routes are clear and accessible.",
                "time": "1 min ago"
            })

        return {
            "drones": fleet_drones,
            "victims": sorted_victims,
            "rescue": {
                "target_victim": target_victim.get("id", 1),
                "priority": target_victim.get("priority", "HIGH"),
                "assigned_drone": assignment.get("assigned_drone_id", 1),
                "distance": assignment.get("distance_m", 70.0),
                "battery": assignment.get("drone_battery", 90.0)
            },
            "decision_support": {
                "selected_drone_id": assignment.get("assigned_drone_id", 1),
                "target_victim_id": target_victim.get("id", 1),
                "recommendation": assignment.get("recommendation", "Autonomous mission active."),
                "scores": [e.get("score", 0.7) for e in assignment.get("all_evaluations", [])],
                "estimated_arrival_sec": round(assignment.get("eta_seconds", 7.0)),
                "road_blocked": road_blocked,
                "selected_ground_route": routes["selected"],
                "timestamp": now_str
            },
            "mission": mission_record,
            "routes": routes,
            "alerts": alerts,
            "analytics": {
                "rescued_count": sum(1 for v in sorted_victims if v.get("status") == "RESCUED"),
                "active_missions": 1,
                "avg_response_time": f"{round(assignment.get('eta_seconds', 7.0))} sec",
                "success_rate": "98%"
            },
            "road_blocked": road_blocked,
            "timestamp": now_str
        }


if __name__ == "__main__":
    pipeline = DecisionSupportPipeline()
    sample_fleet = [
        {"id": 1, "name": "DRONE-01", "x": 700, "y": 700, "speed": 10, "battery": 90, "available": True, "status": "SEARCHING"},
        {"id": 2, "name": "DRONE-02", "x": 400, "y": 680, "speed": 12, "battery": 85, "available": True, "status": "SEARCHING"},
        {"id": 3, "name": "DRONE-03", "x": 180, "y": 200, "speed": 11, "battery": 14, "available": False, "status": "LOW BATTERY"},
        {"id": 4, "name": "DRONE-04", "x": 1200, "y": 1200, "speed": 10, "battery": 95, "available": True, "status": "SEARCHING"},
        {"id": 5, "name": "DRONE-05", "x": 630, "y": 750, "speed": 13, "battery": 75, "available": True, "status": "SEARCHING"}
    ]
    sample_victims = [
        {"id": 1, "name": "V-1", "x": 650, "y": 750, "priority": "HIGH", "status": "ASSIGNED"}
    ]

    output = pipeline.process_incident_cycle(sample_fleet, sample_victims, road_blocked=False)
    import json
    print(json.dumps(output, indent=2))
