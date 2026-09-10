# DRISHTI: Computer Vision & YOLO Pipeline Specification

## Pipeline Flow
$$\text{Drone Camera} \longrightarrow \text{OpenCV Frame Extraction} \longrightarrow \text{YOLOv8 Inference} \longrightarrow \text{Person Candidates} \longrightarrow \text{Decision Engine}$$

## Technical Specs
- **Model:** Pretrained `yolov8n.pt` (Ultralytics)
- **Target Class:** `person` (Class index 0 in MS COCO dataset)
- **Inference Confidence Threshold:** $\ge 0.35$
- **Output:** Bounding boxes `[x1, y1, x2, y2]`, confidence scores, person count, and estimated coordinates relative to source drone.

## Ethical Defense During SIH Judging
Judges frequently ask: *"Can YOLO tell if a victim is bleeding or unconscious?"*  
**Correct Answer:** *"No. YOLO is an object detector that identifies people. In DRISHTI, we do not make false medical claims. Triage urgency is calculated downstream by our explainable Decision Engine using operational factors like hazard zone proximity, environmental exposure, and casualty clustering."*
