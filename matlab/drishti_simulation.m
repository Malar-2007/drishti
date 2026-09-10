%% DRISHTI: AI-Powered Multi-Drone Search and Rescue Simulation Engine
% Continuous simulation script for multi-drone search and rescue decision support.
% Run directly inside MATLAB:
% >> drishti_simulation

function drishti_simulation()
    clear; clc;
    fprintf('=======================================================\n');
    fprintf('   DRISHTI: AI-POWERED MULTI-DRONE RESCUE SIMULATOR    \n');
    fprintf('=======================================================\n');
    fprintf('Initializing simulation parameters...\n');

    % --- Configuration & File Paths ---
    currentFolder = fileparts(mfilename('fullpath'));
    projectRoot = fileparts(currentFolder);
    outputDir = fullfile(projectRoot, 'public', 'data');
    if ~exist(outputDir, 'dir')
        mkdir(outputDir);
    end
    outputFile = fullfile(outputDir, 'rescue_results.json');
    tempFile = fullfile(outputDir, 'rescue_results_temp.json');

    % --- Simulation Parameters ---
    dt = 1.0;                  % Time step in seconds
    loopDelay = 1.5;           % Pause interval between iterations (seconds)
    searchRadius = 250;        % Detection radius for drones in meters
    maxDistance = 3000;        % Normalization distance for scoring (meters)
    maxSpeed = 15;             % Max drone speed (m/s)
    batteryLowThreshold = 25;  % Low battery warning threshold (%)
    batteryCriticalThreshold = 15; % Critical battery threshold (%)
    
    % AI Decision Weightings (Multi-Criteria Optimization)
    w_dist = 0.45;
    w_battery = 0.25;
    w_speed = 0.15;
    w_avail = 0.15;

    % --- Drone Fleet Initialization ---
    drones = struct(...
        'id', {1, 2, 3, 4, 5}, ...
        'name', {'DRONE-01', 'DRONE-02', 'DRONE-03', 'DRONE-04', 'DRONE-05'}, ...
        'x', {700, -420, 1160, 100, 980}, ...
        'y', {700, 1120, -460, 0, 1480}, ...
        'altitude', {100, 100, 100, 100, 100}, ...
        'speed', {10, 12, 11, 10, 13}, ...
        'battery', {90, 85, 80, 95, 75}, ...
        'available', {true, true, true, true, true}, ...
        'status', {'SEARCHING', 'SEARCHING', 'SEARCHING', 'SEARCHING', 'SEARCHING'}, ...
        'vx', {6, -5, 7, 4, -6}, ...
        'vy', {5, 6, -4, 8, -5} ...
    );

    % --- Victims Initialization ---
    victims = struct(...
        'id', {1, 2, 3}, ...
        'name', {'V-1', 'V-2', 'V-3'}, ...
        'x', {650, 250, 800}, ...
        'y', {750, 450, 250}, ...
        'priority', {'HIGH', 'MEDIUM', 'LOW'}, ...
        'detected', {true, true, true}, ...
        'status', {'DETECTED', 'DETECTED', 'DETECTED'}, ...
        'assignedDrone', {0, 0, 0}, ...
        'rescueTimer', {0, 0, 0} ...
    );

    % --- Rescue Base & Ground Team ---
    rescueTeam = struct(...
        'id', 1, ...
        'name', 'RESCUE TEAM 01', ...
        'x', 500, ...
        'y', 500, ...
        'status', 'READY' ...
    );

    % --- Road Network Simulation ---
    roadBlocked = false;
    blockageStep = 18;  % Trigger road blockage at step 18 for demonstration
    rescuedCount = 0;
    activeMissionId = 'M-001';

    % --- Simulation Loop ---
    step = 0;
    maxSteps = 1000; % Continuous simulation loop
    fprintf('Simulation active. Writing to: %s\n', outputFile);
    fprintf('Press Ctrl+C in MATLAB command window to stop.\n\n');

    while step < maxSteps
        step = step + 1;
        timestamp = datestr(now, 'yyyy-mm-dd HH:MM:SS');

        % 1. Multi-Victim Priority Selection (HIGH -> MEDIUM -> LOW)
        targetVictimIdx = 0;
        for v = 1:numel(victims)
            if strcmp(victims(v).status, 'ASSIGNED')
                targetVictimIdx = v;
                break;
            end
        end
        if targetVictimIdx == 0
            % Find highest priority unrescued victim
            for v = 1:numel(victims)
                if strcmp(victims(v).priority, 'HIGH') && ~strcmp(victims(v).status, 'RESCUED')
                    targetVictimIdx = v;
                    victims(v).status = 'ASSIGNED';
                    break;
                end
            end
        end
        if targetVictimIdx == 0
            for v = 1:numel(victims)
                if strcmp(victims(v).priority, 'MEDIUM') && ~strcmp(victims(v).status, 'RESCUED')
                    targetVictimIdx = v;
                    victims(v).status = 'ASSIGNED';
                    break;
                end
            end
        end
        if targetVictimIdx == 0
            for v = 1:numel(victims)
                if strcmp(victims(v).priority, 'LOW') && ~strcmp(victims(v).status, 'RESCUED')
                    targetVictimIdx = v;
                    victims(v).status = 'ASSIGNED';
                    break;
                end
            end
        end
        if targetVictimIdx == 0
            targetVictimIdx = 1; % All rescued or fallback
        end

        targetVictim = victims(targetVictimIdx);
        activeMissionId = sprintf('M-%03d', targetVictim.id);

        % 2. Intelligent AI Drone Selection Scoring Algorithm
        bestDroneIdx = 1;
        highestScore = -Inf;
        scores = zeros(1, numel(drones));

        for i = 1:numel(drones)
            dist = sqrt((drones(i).x - targetVictim.x)^2 + (drones(i).y - targetVictim.y)^2);
            f_dist = max(0, 1 - (dist / maxDistance));
            f_bat = drones(i).battery / 100;
            f_speed = drones(i).speed / maxSpeed;
            f_avail = double(drones(i).available && drones(i).battery > batteryLowThreshold);

            score = (w_dist * f_dist) + (w_battery * f_bat) + (w_speed * f_speed) + (w_avail * f_avail);
            if drones(i).battery <= batteryCriticalThreshold
                score = score * 0.05;
            end
            scores(i) = score;

            if score > highestScore
                highestScore = score;
                bestDroneIdx = i;
            end
        end

        assignedDrone = drones(bestDroneIdx);
        victims(targetVictimIdx).assignedDrone = assignedDrone.id;

        % 3. Drone Kinematics & Mission Progression
        for i = 1:numel(drones)
            if i == bestDroneIdx && ~strcmp(targetVictim.status, 'RESCUED')
                % Fly directly towards assigned victim
                dx = targetVictim.x - drones(i).x;
                dy = targetVictim.y - drones(i).y;
                distToTarget = sqrt(dx^2 + dy^2);

                if distToTarget > 15
                    drones(i).x = drones(i).x + (dx / distToTarget) * drones(i).speed * dt;
                    drones(i).y = drones(i).y + (dy / distToTarget) * drones(i).speed * dt;
                    drones(i).status = 'ASSIGNED';
                else
                    drones(i).status = 'RESCUING';
                    victims(targetVictimIdx).rescueTimer = victims(targetVictimIdx).rescueTimer + 1;
                    if victims(targetVictimIdx).rescueTimer >= 5
                        victims(targetVictimIdx).status = 'RESCUED';
                        rescuedCount = rescuedCount + 1;
                    end
                end
            elseif drones(i).battery <= batteryCriticalThreshold
                % Return to base
                drones(i).status = 'LOW BATTERY';
                drones(i).available = false;
                dx = rescueTeam.x - drones(i).x;
                dy = rescueTeam.y - drones(i).y;
                distBase = sqrt(dx^2 + dy^2);
                if distBase > 20
                    drones(i).x = drones(i).x + (dx / distBase) * (drones(i).speed * 0.7) * dt;
                    drones(i).y = drones(i).y + (dy / distBase) * (drones(i).speed * 0.7) * dt;
                end
            elseif drones(i).available
                % Patrol search pattern
                drones(i).status = 'SEARCHING';
                drones(i).x = drones(i).x + drones(i).vx * dt;
                drones(i).y = drones(i).y + drones(i).vy * dt;

                if drones(i).x > 1500 || drones(i).x < -600
                    drones(i).vx = -drones(i).vx;
                end
                if drones(i).y > 1600 || drones(i).y < -600
                    drones(i).vy = -drones(i).vy;
                end
            end

            % Battery depletion
            drainRate = 0.05 + (drones(i).speed / 20) * 0.08;
            if strcmp(drones(i).status, 'RESCUING')
                drainRate = drainRate + 0.08;
            end
            drones(i).battery = max(0, drones(i).battery - drainRate);
            if drones(i).battery <= batteryCriticalThreshold
                drones(i).available = false;
            end
        end

        assignedDistance = sqrt((assignedDrone.x - targetVictim.x)^2 + (assignedDrone.y - targetVictim.y)^2);

        % 4. Road Blockage Simulation & Route Calculations
        if step >= blockageStep && step < (blockageStep + 25)
            roadBlocked = true;
        else
            roadBlocked = false;
        end

        % Ground Route Calculation
        routeShortest = [500, 500; 520, 560; 580, 650; targetVictim.x, targetVictim.y];
        routeFastest = [500, 500; 620, 520; 680, 620; targetVictim.x, targetVictim.y];
        routeAlternative = [500, 500; 400, 650; 450, 800; 550, 900; targetVictim.x, targetVictim.y];

        selectedRouteName = 'fastest';
        if roadBlocked
            selectedRouteName = 'alternative';
        end

        % Decision support rationale text
        estArrivalSec = round(assignedDistance / max(assignedDrone.speed, 1), 1);
        decisionRationale = sprintf('%s selected for %s: %s priority + est. response time %.0fs + battery %.0f%% (AI Score: %.2f)', ...
            assignedDrone.name, targetVictim.name, targetVictim.priority, estArrivalSec, assignedDrone.battery, highestScore);

        % 5. Dynamic Alerts
        alerts = {};
        if strcmp(targetVictim.status, 'RESCUED')
            alerts{end+1} = struct('type', 'INFO', 'title', sprintf('%s RESCUED', targetVictim.name), ...
                'message', sprintf('Victim %s successfully stabilized and extricated by Ground Unit.', targetVictim.name), ...
                'time', 'Just now');
        else
            alerts{end+1} = struct('type', 'HIGH', 'title', 'HIGH PRIORITY VICTIM DETECTED', ...
                'message', sprintf('Victim %s located at (%d, %d). Immediate rescue active.', targetVictim.name, targetVictim.x, targetVictim.y), ...
                'time', 'Just now');
        end

        alerts{end+1} = struct('type', 'INFO', 'title', sprintf('%s ASSIGNED', assignedDrone.name), ...
            'message', sprintf('%s locked onto target %s. Distance: %.1fm.', assignedDrone.name, targetVictim.name, assignedDistance), ...
            'time', 'Live');

        if roadBlocked
            alerts{end+1} = struct('type', 'HIGH', 'title', 'ROAD BLOCKED', ...
                'message', 'Arterial route blocked. Alternative ground corridor active.', ...
                'time', 'Just now');
        else
            alerts{end+1} = struct('type', 'INFO', 'title', 'ROAD CONDITION MONITORED', ...
                'message', 'Ground rescue route is clear and accessible.', ...
                'time', '1 min ago');
        end

        for i = 1:numel(drones)
            if drones(i).battery < batteryLowThreshold
                alerts{end+1} = struct('type', 'WARNING', 'title', sprintf('%s LOW BATTERY', drones(i).name), ...
                    'message', sprintf('%s battery level at %.0f%%. Return-to-base protocol standby.', drones(i).name, drones(i).battery), ...
                    'time', 'Active');
            end
        end

        % 6. Construct Full Output Data Structure
        dronesExport = cell(1, numel(drones));
        for i = 1:numel(drones)
            dronesExport{i} = struct(...
                'id', drones(i).id, ...
                'name', drones(i).name, ...
                'x', round(drones(i).x, 1), ...
                'y', round(drones(i).y, 1), ...
                'altitude', drones(i).altitude, ...
                'speed', drones(i).speed, ...
                'battery', round(drones(i).battery, 1), ...
                'available', drones(i).available, ...
                'status', drones(i).status ...
            );
        end

        victimsExport = cell(1, numel(victims));
        for v = 1:numel(victims)
            victimsExport{v} = struct(...
                'id', victims(v).id, ...
                'name', victims(v).name, ...
                'x', victims(v).x, ...
                'y', victims(v).y, ...
                'priority', victims(v).priority, ...
                'status', victims(v).status, ...
                'assignedDrone', victims(v).assignedDrone ...
            );
        end

        rescueExport = struct(...
            'target_victim', targetVictim.id, ...
            'priority', targetVictim.priority, ...
            'assigned_drone', assignedDrone.id, ...
            'distance', round(assignedDistance, 2), ...
            'battery', round(assignedDrone.battery, 1) ...
        );

        decisionSupport = struct(...
            'selected_drone_id', assignedDrone.id, ...
            'target_victim_id', targetVictim.id, ...
            'recommendation', decisionRationale, ...
            'scores', scores, ...
            'estimated_arrival_sec', estArrivalSec, ...
            'road_blocked', roadBlocked, ...
            'selected_ground_route', selectedRouteName, ...
            'step', step, ...
            'timestamp', timestamp ...
        );

        missionExport = struct(...
            'id', activeMissionId, ...
            'status', targetVictim.status, ...
            'targetVictim', targetVictim.id, ...
            'assignedDrone', assignedDrone.id, ...
            'estTime', sprintf('%.0f sec', estArrivalSec), ...
            'distance', sprintf('%.1f m', assignedDistance) ...
        );

        routesExport = struct(...
            'selected', selectedRouteName, ...
            'road_blocked', roadBlocked, ...
            'shortest_distance', '1.8 km', ...
            'shortest_time', '8 min', ...
            'fastest_distance', '2.4 km', ...
            'fastest_time', '6 min', ...
            'alternative_distance', '3.1 km', ...
            'alternative_time', '11 min' ...
        );

        analyticsExport = struct(...
            'rescued_count', rescuedCount, ...
            'active_missions', 1, ...
            'avg_response_time', sprintf('%.0f sec', estArrivalSec), ...
            'success_rate', '98%' ...
        );

        outputStruct = struct(...
            'drones', {dronesExport}, ...
            'victims', {victimsExport}, ...
            'rescue', rescueExport, ...
            'decision_support', decisionSupport, ...
            'mission', missionExport, ...
            'routes', routesExport, ...
            'analytics', analyticsExport, ...
            'road_blocked', roadBlocked, ...
            'alerts', {alerts}, ...
            'simulation_step', step, ...
            'timestamp', timestamp ...
        );

        % 7. Atomic JSON File Writing (Guaranteed Reliable Backup)
        jsonStr = jsonencode(outputStruct);
        fid = fopen(tempFile, 'w');
        if fid ~= -1
            fwrite(fid, jsonStr, 'char');
            fclose(fid);
            movefile(tempFile, outputFile, 'f');
        end

        % 8. Real-Time Push to DRISHTI Backend (WebSocket Broadcaster)
        try
            httpOpts = weboptions('MediaType', 'application/json', 'Timeout', 0.5, 'RequestMethod', 'post');
            webwrite('http://localhost:5000/api/simulation-data', outputStruct, httpOpts);
        catch
            % Backend offline; file backup remains continuously active
        end

        fprintf('[Step %03d | %s] Assigned: %s -> %s (Dist: %.1fm, Bat: %.0f%%) | Blocked: %s | Rescued: %d\n', ...
            step, timestamp, assignedDrone.name, targetVictim.name, ...
            assignedDistance, assignedDrone.battery, string(roadBlocked), rescuedCount);

        pause(loopDelay);
    end

    fprintf('Simulation loop finished.\n');
end
