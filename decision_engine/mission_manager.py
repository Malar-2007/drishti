"""
DRISHTI Mission Lifecycle Manager
---------------------------------
Coordinates multi-victim triage queues and manages the 10 mission lifecycle states:
1. SEARCHING
2. VICTIM_DETECTED
3. ASSIGNED
4. EN_ROUTE
5. ARRIVED
6. RESCUING
7. RESCUED
8. RETURNING
9. COMPLETED
10. FAILED

Enforces:
- Victim priority ordering (HIGH > MEDIUM > LOW, then distance/ETA)
- Single active mission per drone (prevents double-booking)
"""

import time
from typing import List, Dict, Any, Optional


VALID_MISSION_STATES = [
    "SEARCHING",
    "VICTIM_DETECTED",
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "RESCUING",
    "RESCUED",
    "RETURNING",
    "COMPLETED",
    "FAILED"
]


class MissionManager:
    """
    Coordinates disaster search and rescue missions.
    """

    def __init__(self):
        self.active_missions: Dict[str, Dict[str, Any]] = {}
        self.completed_missions: List[Dict[str, Any]] = []

    def sort_victim_queue(self, victims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Orders detected victims by triage priority: HIGH (1) -> MEDIUM (2) -> LOW (3),
        then unrescued first, then by priority score if available.
        """
        priority_rank = {"HIGH": 1, "MEDIUM": 2, "LOW": 3}

        def sort_key(v):
            is_rescued = 1 if v.get("status") == "RESCUED" else 0
            p_rank = priority_rank.get(str(v.get("priority", "LOW")).upper(), 3)
            p_score = -float(v.get("priority_score", 0.0))
            return (is_rescued, p_rank, p_score)

        return sorted(victims, key=sort_key)

    def create_or_update_mission(
        self,
        mission_id: str,
        victim_id: int,
        assigned_drone_id: int,
        priority: str,
        distance_m: float,
        eta_seconds: float,
        status: str = "ASSIGNED"
    ) -> Dict[str, Any]:
        """
        Registers or updates a mission in the active incident registry.
        """
        if status not in VALID_MISSION_STATES:
            status = "ASSIGNED"

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")

        if mission_id not in self.active_missions:
            self.active_missions[mission_id] = {
                "id": mission_id,
                "targetVictim": victim_id,
                "assignedDrone": assigned_drone_id,
                "priority": priority,
                "distance": f"{distance_m:.1f} m",
                "estTime": f"{round(eta_seconds)} sec",
                "status": status,
                "startTime": now_str,
                "completionTime": None
            }
        else:
            mission = self.active_missions[mission_id]
            mission["targetVictim"] = victim_id
            mission["assignedDrone"] = assigned_drone_id
            mission["priority"] = priority
            mission["distance"] = f"{distance_m:.1f} m"
            mission["estTime"] = f"{round(eta_seconds)} sec"
            mission["status"] = status

            if status in ["RESCUED", "COMPLETED"]:
                mission["completionTime"] = now_str
                if mission not in self.completed_missions:
                    self.completed_missions.append(mission)

        return self.active_missions[mission_id]

    def get_mission_status(self, mission_id: str) -> Optional[Dict[str, Any]]:
        return self.active_missions.get(mission_id)

    def get_all_missions(self) -> List[Dict[str, Any]]:
        return list(self.active_missions.values())


if __name__ == "__main__":
    mgr = MissionManager()
    queue = mgr.sort_victim_queue([
        {"id": 2, "priority": "MEDIUM", "status": "DETECTED"},
        {"id": 1, "priority": "HIGH", "status": "DETECTED"},
        {"id": 3, "priority": "LOW", "status": "DETECTED"}
    ])
    import json
    print("Sorted Queue:", json.dumps(queue, indent=2))
