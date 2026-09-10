%% DRISHTI Modular Victim Simulation
% Manages casualty detection, priority queue, and rescue extrication timers.

function [updatedVictims, targetVictim] = victim_simulation(victims, assignedDroneId)
    if nargin < 2; assignedDroneId = 0; end

    targetIdx = 0;

    % 1. Find currently assigned casualty
    for v = 1:numel(victims)
        if strcmp(victims(v).status, 'ASSIGNED')
            targetIdx = v;
            break;
        end
    end

    % 2. If none currently assigned, allocate to highest priority unrescued victim
    if targetIdx == 0
        priorities = {'HIGH', 'MEDIUM', 'LOW'};
        for p = 1:numel(priorities)
            for v = 1:numel(victims)
                if strcmp(victims(v).priority, priorities{p}) && ~strcmp(victims(v).status, 'RESCUED')
                    targetIdx = v;
                    victims(v).status = 'ASSIGNED';
                    break;
                end
            end
            if targetIdx ~= 0; break; end
        end
    end

    if targetIdx == 0
        targetIdx = 1;
    end

    if assignedDroneId > 0
        victims(targetIdx).assignedDrone = assignedDroneId;
    end

    targetVictim = victims(targetIdx);
    updatedVictims = victims;
end
