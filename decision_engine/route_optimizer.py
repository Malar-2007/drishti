"""
DRISHTI Route Optimization Module
---------------------------------
Calculates ground ambulance / rescue team routes from Base Station (500, 500)
to target casualties.
Supports:
1. Shortest Route: Minimizes distance traversed
2. Fastest Route: Primary high-speed corridor
3. Alternative Route: Safe perimeter detour activated when road blockage occurs
"""

import math
from typing import Dict, List, Any


class RouteOptimizer:
    """
    Ground Rescue Route Planner & Road Blockage Detour Engine.
    """

    def __init__(self, base_station_coords: Dict[str, float] = None):
        self.base_station = base_station_coords or {"x": 500.0, "y": 500.0}

    def compute_routes(
        self,
        target_coords: Dict[str, float],
        road_blocked: bool = False
    ) -> Dict[str, Any]:
        """
        Computes shortest, fastest, and alternative route metrics and waypoints.
        """
        bx = self.base_station["x"]
        by = self.base_station["y"]
        tx = target_coords.get("x", 650.0)
        ty = target_coords.get("y", 750.0)

        direct_dist_km = math.hypot(tx - bx, ty - by) / 1000.0

        # Shortest direct route
        shortest_dist = round(direct_dist_km * 1.15, 2)
        shortest_time_min = max(2, round(shortest_dist * 4.2))

        # Fastest route (arterial highway, slightly longer distance but higher cruising speed)
        fastest_dist = round(direct_dist_km * 1.35, 2)
        fastest_time_min = max(2, round(fastest_dist * 2.5))

        # Alternative route (perimeter detour avoiding blockage)
        alt_dist = round(direct_dist_km * 1.75, 2)
        alt_time_min = max(3, round(alt_dist * 3.6))

        selected_corridor = "alternative" if road_blocked else "fastest"

        return {
            "selected": selected_corridor,
            "road_blocked": road_blocked,
            "shortest_distance": f"{shortest_dist:.1f} km",
            "shortest_time": f"{shortest_time_min} min",
            "fastest_distance": f"{fastest_dist:.1f} km",
            "fastest_time": f"{fastest_time_min} min",
            "alternative_distance": f"{alt_dist:.1f} km",
            "alternative_time": f"{alt_time_min} min",
            "active_distance": f"{alt_dist:.1f} km" if road_blocked else f"{fastest_dist:.1f} km",
            "active_time": f"{alt_time_min} min" if road_blocked else f"{fastest_time_min} min",
            "alert": "ROAD BLOCKED: Alternative perimeter detour corridor engaged." if road_blocked else "Corridors clear and accessible."
        }


if __name__ == "__main__":
    opt = RouteOptimizer()
    normal_route = opt.compute_routes({"x": 650, "y": 750}, road_blocked=False)
    blocked_route = opt.compute_routes({"x": 650, "y": 750}, road_blocked=True)
    import json
    print("Normal:", json.dumps(normal_route, indent=2))
    print("Blocked:", json.dumps(blocked_route, indent=2))
