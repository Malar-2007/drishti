@echo off
echo =======================================================
echo    DRISHTI: AI-POWERED RESCUE DECISION SUPPORT
echo    Starting SIH Demonstration Environment...
echo =======================================================

echo Starting DRISHTI Backend Server (Port 5000)...
start "DRISHTI Backend" cmd /k "npm run server"

timeout /t 2 >nul

echo Starting DRISHTI React Dashboard (Port 5173)...
start "DRISHTI Frontend" cmd /k "npm run dev"

echo.
echo =======================================================
echo All services launched!
echo - React Dashboard: http://localhost:5173
echo - Backend API:     http://localhost:5000
echo - WebSocket Bus:   ws://localhost:5000
echo.
echo To run simulation telemetry:
echo - In MATLAB: cd matlab and run drishti_simulation
echo - In Node (Companion): npm run simulate
echo =======================================================
