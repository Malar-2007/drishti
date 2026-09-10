# DRISHTI MATLAB Simulation Engine

This directory contains the MATLAB simulation engine for the **DRISHTI AI-Powered Multi-Drone Search and Rescue Platform**.

## Files
- `drishti_simulation.m`: The primary continuous simulation loop. Simulates drone kinematics, battery depletion, search coverage, victim detection, multi-criteria AI drone scoring and assignment, road blockage detection, alternative ground routing, and atomic JSON export.
- `drishti_step.m`: Modular single-step simulation function for step-by-step debugging or integration with MATLAB Simulink.

## How to Run in MATLAB
1. Open MATLAB on your machine.
2. In the MATLAB Command Window, navigate to the `matlab` folder:
   ```matlab
   cd 'C:\Users\Mary Sugandha Malar\OneDrive\Desktop\Drishti\drishti\matlab'
   ```
3. Run the simulation script:
   ```matlab
   drishti_simulation
   ```
4. MATLAB will begin continuously updating `public/data/rescue_results.json` every 1.5 seconds.
5. In your web browser, watch the DRISHTI React dashboard update in real time!
6. To stop the simulation, press `Ctrl + C` in the MATLAB Command Window.

## Companion Runner (No MATLAB required)
For testing and development when MATLAB is not running, DRISHTI also provides an identical Node.js simulation engine:
```bash
npm run simulate
```
This runs the exact same mathematical kinematics, battery depletion, and decision-support algorithms.
