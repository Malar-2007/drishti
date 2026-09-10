"""
DRISHTI Explainable Priority Engine
-----------------------------------
Evaluates casualty urgency and priority for detected persons without inventing false medical conditions.
Determines: HIGH, MEDIUM, LOW priority.
Generates an explicit, audit-proof array of human-readable rationale strings.
"""

from typing import Dict, List, Any


class PriorityEngine:
    """
    Explainable Triage & Urgency Evaluation for Search and Rescue.
    """

    def __init__(
        self,
        weight_confidence: float = 0.25,
        weight_hazard_zone: float = 0.35,
        weight_group_density: float = 0.20,
        weight_isolation: float = 0.20
    ):
        self.w_conf = weight_confidence
        self.w_zone = weight_hazard_zone
        self.w_group = weight_group_density
        self.w_iso = weight_isolation

    def evaluate_priority(
        self,
        victim_id: str,
        detection_data: Dict[str, Any],
        disaster_zone_active: bool = True,
        nearby_persons_count: int = 1,
        distance_to_base_m: float = 800.0
    ) -> Dict[str, Any]:
        """
        Calculates explainable priority score (0 - 100) and classification (HIGH, MEDIUM, LOW).
        Returns priority and human-readable explanation reasons.
        """
        conf = float(detection_data.get("confidence", 0.85))
        reasons: List[str] = []

        # 1. Confidence score factor (0 to 100)
        f_conf = min(1.0, max(0.0, conf)) * 100.0
        if conf >= 0.85:
            reasons.append(f"High-confidence person detection ({conf * 100:.1f}%) confirmed by aerial vision")
        elif conf >= 0.60:
            reasons.append(f"Moderate-confidence candidate detection ({conf * 100:.1f}%)")
        else:
            reasons.append(f"Preliminary visual detection ({conf * 100:.1f}%) requiring close UAV verification")

        # 2. Disaster-zone location factor
        f_zone = 100.0 if disaster_zone_active else 30.0
        if disaster_zone_active:
            reasons.append("Geolocation confirms position inside active high-risk disaster perimeter")
        else:
            reasons.append("Position located in peripheral buffer zone")

        # 3. Group clustering factor (Multiple people detected nearby increase priority)
        f_group = min(100.0, 30.0 + (nearby_persons_count - 1) * 35.0)
        if nearby_persons_count > 1:
            reasons.append(f"Multi-person distress cluster ({nearby_persons_count} individuals detected in sector)")
        else:
            reasons.append("Single individual detected at incident site")

        # 4. Environmental isolation / distance from rescue base
        # Further distance in hostile environment warrants rapid intervention
        f_iso = min(100.0, (distance_to_base_m / 2000.0) * 100.0)
        if distance_to_base_m > 1000:
            reasons.append(f"High isolation distance ({distance_to_base_m:.0f}m from nearest base station)")

        # Weighted aggregate score
        total_score = (
            (self.w_conf * f_conf) +
            (self.w_zone * f_zone) +
            (self.w_group * f_group) +
            (self.w_iso * f_iso)
        )
        total_score = round(total_score, 1)

        # Classification thresholds
        if total_score >= 70.0:
            priority = "HIGH"
        elif total_score >= 45.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return {
            "victim_id": victim_id,
            "priority": priority,
            "priority_score": total_score,
            "priority_reasons": reasons,
            "factors": {
                "detection_confidence": round(conf, 3),
                "disaster_zone_active": disaster_zone_active,
                "nearby_persons_count": nearby_persons_count,
                "distance_to_base_m": round(distance_to_base_m, 1)
            }
        }


if __name__ == "__main__":
    engine = PriorityEngine()
    result = engine.evaluate_priority(
        victim_id="V-04",
        detection_data={"confidence": 0.92},
        disaster_zone_active=True,
        nearby_persons_count=2,
        distance_to_base_m=1200.0
    )
    import json
    print(json.dumps(result, indent=2))
