%% DRISHTI: Single-Step Simulation Function
% Updates drone positions, runs AI decision support, and writes JSON.
% Can be called iteratively or integrated into larger MATLAB/Simulink workflows.

function state = drishti_step(currentState)
    % Initialize default state if not provided
    if nargin < 1 || isempty(currentState)
        currentState = init_default_state();
    end

    dt = 1.0;
    maxDistance = 3000;
    maxSpeed = 15;
    w_dist = 0.45;
    w_battery = 0.25;
    w_speed = 0.15;
    w_avail = 0.15;

    currentState.step = currentState.step + 1;
    drones = currentState.drones;
    victims = currentState.victims;

    % 1. Kinematics Update
    for i = 1:numel(drones)
        if strcmp(drones(i).status, 'SEARCHING') || drones(i).available
            drones(i).x = drones(i).x + drones(i).vx * dt;
            drones(i).y = drones(i).y + drones(i).vy * dt;

            if drones(i).x > 1500 || drones(i).x < -600
                drones(i).vx = -drones(i).vx;
            end
            if drones(i).y > 1600 || drones(i).y < -600
                drones(i).vy = -drones(i).vy;
            end
        elseif strcmp(drones(i).status, 'ASSIGNED') || strcmp(drones(i).status, 'RESCUING')
            targetX = victims(1).x;
            targetY = victims(1).y;
            dx = targetX - drones(i).x;
            dy = targetY - drones(i).y;
            dist = sqrt(dx^2 + dy^2);
            if dist > 15
                drones(i).x = drones(i).x + (dx / dist) * drones(i).speed * dt;
                drones(i).y = drones(i).y + (dy / dist) * drones(i).speed * dt;
            else
                drones(i).status = 'RESCUING';
            end
        end

        % Battery drain
        drainRate = 0.05 + (drones(i).speed / 20) * 0.08;
        drones(i).battery = max(0, drones(i).battery - drainRate);
        if drones(i).battery <= 15
            drones(i).available = false;
            drones(i).status = 'LOW BATTERY';
        end
    end

    % 2. AI Drone Scoring
    targetVictim = victims(1);
    bestDroneIdx = 1;
    highestScore = -Inf;
    scores = zeros(1, numel(drones));

    for i = 1:numel(drones)
        dist = sqrt((drones(i).x - targetVictim.x)^2 + (drones(i).y - targetVictim.y)^2);
        f_dist = max(0, 1 - (dist / maxDistance));
        f_bat = drones(i).battery / 100;
        f_speed = drones(i).speed / maxSpeed;
        f_avail = double(drones(i).available && drones(i).battery > 25);

        score = (w_dist * f_dist) + (w_battery * f_bat) + (w_speed * f_speed) + (w_avail * f_avail);
        if drones(i).battery <= 15
            score = score * 0.1;
        end
        scores(i) = score;
        if score > highestScore
            highestScore = score;
            bestDroneIdx = i;
        end
    end

    assignedDrone = drones(bestDroneIdx);
    assignedDistance = sqrt((assignedDrone.x - targetVictim.x)^2 + (assignedDrone.y - targetVictim.y)^2);

    for i = 1:numel(drones)
        if i == bestDroneIdx
            if assignedDistance <= 20
                drones(i).status = 'RESCUING';
            else
                drones(i).status = 'ASSIGNED';
            end
        elseif drones(i).available && drones(i).battery > 25
            drones(i).status = 'SEARCHING';
        end
    end

    currentState.drones = drones;
    currentState.scores = scores;
    currentState.assignedDrone = assignedDrone;
    currentState.assignedDistance = assignedDistance;
    state = currentState;
end

function defaultState = init_default_state()
    defaultState.step = 0;
    defaultState.drones = struct(...
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
    defaultState.victims = struct(...
        'id', {1, 2, 3}, ...
        'name', {'V-1', 'V-2', 'V-3'}, ...
        'x', {650, 250, 800}, ...
        'y', {750, 450, 250}, ...
        'priority', {'HIGH', 'MEDIUM', 'LOW'}, ...
        'status', {'ASSIGNED', 'DETECTED', 'DETECTED'}, ...
        'assignedDrone', {1, 0, 0} ...
    );
end
