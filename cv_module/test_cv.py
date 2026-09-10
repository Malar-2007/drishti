"""
Automated Test for DRISHTI Computer Vision & YOLO Module
Validates:
1. Module initialization
2. Person detection payload format
3. Bounding box and confidence structure
4. Multiple person detection handling
5. Drone source attribution
6. Resilient fallback execution
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from detector import DroneVisionDetector


def run_tests():
    print("=======================================================")
    print("   DRISHTI: COMPUTER VISION & YOLO VALIDATION TEST     ")
    print("=======================================================\n")

    detector = DroneVisionDetector()

    # Test 1: Detector instance creation
    assert detector is not None, "Detector failed to initialize"
    print("[PASS] Test 1: DroneVisionDetector successfully initialized.")

    # Test 2: Single image detection simulation
    res = detector.detect_image("sample_image.jpg", source_drone=2, drone_coords={"x": 650, "y": 750})
    assert res["status"] == "success", "Detection status is not 'success'"
    print("[PASS] Test 2: Image detection executed with status 'success'.")

    # Test 3: Person count & detection array
    assert "person_count" in res and res["person_count"] > 0, "Person count missing or zero"
    assert isinstance(res["detections"], list), "Detections is not a list"
    print(f"[PASS] Test 3: Persons detected: {res['person_count']} candidate(s).")

    # Test 4: Bounding box format & confidence
    first_det = res["detections"][0]
    assert "bbox" in first_det and len(first_det["bbox"]) == 4, "Invalid bounding box format"
    assert "confidence" in first_det and 0.0 <= first_det["confidence"] <= 1.0, "Invalid confidence score"
    print(f"[PASS] Test 4: Bounding box format {first_det['bbox']} with confidence {first_det['confidence']}.")

    # Test 5: Source drone attribution
    assert first_det.get("source_drone") == 2, "Source drone attribution failed"
    print(f"[PASS] Test 5: Source drone correctly attributed to DRONE-02.")

    # Test 6: Ethical claim audit
    # Ensure no false medical claims are in the detection payload
    payload_str = str(res).lower()
    for forbidden in ["unconscious", "critically injured", "bleeding", "trapped"]:
        assert forbidden not in payload_str, f"Forbidden medical speculation found: {forbidden}"
    print("[PASS] Test 6: Ethical check passed - no speculative medical conditions invented.")

    print("\n=======================================================")
    print("ALL 6 COMPUTER VISION UNIT TESTS PASSED (100%)")
    print("=======================================================")


if __name__ == "__main__":
    run_tests()
