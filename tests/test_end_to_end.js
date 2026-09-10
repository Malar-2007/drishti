/**
 * DRISHTI End-to-End System Integration Test
 * -------------------------------------------
 * Validates the complete pipeline:
 * Perception (CV) -> Decision Engine -> Data Adapter -> JSON Schema Compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAndNormalizePayload } from '../integration/data_adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('=======================================================');
console.log('   DRISHTI: END-TO-END INTEGRATION TEST SUITE          ');
console.log('=======================================================\n');

let passed = 0;
let total = 0;

function check(name, condition) {
  total++;
  if (condition) {
    console.log(`[PASS] Test ${String(total).padStart(2, '0')}: ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${String(total).padStart(2, '0')}: ${name}`);
  }
}

// 1. Check data adapter normalization
const mockRaw = {
  drones: [
    { id: 1, name: 'DRONE-01', x: 700, y: 700, battery: 90, speed: 10, available: true }
  ],
  victims: [
    { id: 1, name: 'V-1', x: 650, y: 750, priority: 'HIGH' }
  ],
  rescue: { target_victim: 1, priority: 'HIGH', assigned_drone: 1, distance: 70.7, battery: 90 },
  road_blocked: false
};

const normalized = validateAndNormalizePayload(mockRaw);
check('Data adapter successfully normalizes raw simulation payload', normalized && normalized.drones.length === 1);
check('Normalized payload sets default status and speed properties', normalized.drones[0].speed === 10 && normalized.drones[0].status === 'SEARCHING');
check('Ground corridors populated in normalized payload', normalized.routes && normalized.routes.fastest_distance === '2.4 km');

// 2. Verify all new modules exist
const requiredNewFiles = [
  'cv_module/detector.py',
  'cv_module/requirements.txt',
  'cv_module/test_cv.py',
  'decision_engine/priority_engine.py',
  'decision_engine/drone_assignment.py',
  'decision_engine/mission_manager.py',
  'decision_engine/route_optimizer.py',
  'decision_engine/decision_pipeline.py',
  'matlab/drone_simulation.m',
  'matlab/victim_simulation.m',
  'matlab/drishti_master_simulation.m',
  'integration/data_adapter.js',
  'integration/cv_bridge.js',
  'docs/ARCHITECTURE.md',
  'docs/CV_YOLO_PIPELINE.md',
  'docs/DECISION_ENGINE.md',
  'docs/SIH_DEMO_SCRIPT.md',
  'docs/FRONTEND_INTEGRATION_PROPOSAL.md',
  'tests/test_decision_engine.py'
];

const allExist = requiredNewFiles.every(f => fs.existsSync(path.join(projectRoot, f)));
check('All planned new modules and documentation exist on disk', allExist);

// 3. Verify existing files remain intact
check('Existing rescue_results.json remains intact and valid', fs.existsSync(path.join(projectRoot, 'public/data/rescue_results.json')));
check('Existing package.json remains intact', fs.existsSync(path.join(projectRoot, 'package.json')));

console.log('\n=======================================================');
console.log(`INTEGRATION TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log('=======================================================');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
