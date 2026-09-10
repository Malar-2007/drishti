%% DRISHTI Modular Drone Simulation
% Simulates multi-drone kinematics, search patterns, and battery discharge.

function updatedDrones = drone_simulation(drones, dt, targetVictim)
    if nargin < 2; dt = 1.0; end
    if nargin < 3; targetVictim = []; end

    batteryCriticalThreshold = 15.0;
    maxSpeed = 15.0;

    for i = 1:numel(drones)
        % 1. Kinematics based on active status
        if strcmp(drones(i).status, 'ASSIGNED') && ~isempty(targetVictim)
            dx = targetVictim.x - drones(i).x;
            dy = targetVictim.y - drones(i).y;
            dist = sqrt(dx^2 + dy^2);

            if dist > 15
                drones(i).x = drones(i).x + (dx / dist) * drones(i).speed * dt;
                drones(i).y = drones(i).y + (dy / dist) * drones(i).speed * dt;
            else
                drones(i).status = 'RESCUING';
            end
        elseif drones(i).battery <= batteryCriticalThreshold
            drones(i).status = 'LOW BATTERY';
            drones(i).available = false;
            % Return towards base at (500, 500)
            dx = 500 - drones(i).x;
            dy = 500 - drones(i).y;
            distBase = sqrt(dx^2 + dy^2);
            if distBase > 20
                drones(i).x = drones(i).x + (dx / distBase) * (drones(i).speed * 0.7) * dt;
                drones(i).y = drones(i).y + (dy / distBase) * (drones(i).speed * 0.7) * dt;
            end
        elseif drones(i).available
            drones(i).status = 'SEARCHING';
            drones(i).x = drones(i).x + drones(i).vx * dt;
            drones(i).y = drones(i).y + drones(i).vy * dt;

            % Boundary bounce
            if drones(i).x > 1500 || drones(i).x < -600
                drones(i).vx = -drones(i).vx;
            end
            if drones(i).y > 1600 || drones(i).y < -600
                drones(i).vy = -drones(i).vy;
            end
        end

        % 2. Battery consumption
        drain = 0.05 + (drones(i).speed / maxSpeed) * 0.08;
        if strcmp(drones(i).status, 'RESCUING')
            drain = drain + 0.07;
        end
        drones(i).battery = max(0, drones(i).battery - drain);

        if drones(i).battery <= batteryCriticalThreshold
            drones(i).available = false;
        end
    end

    updatedDrones = drones;
end
