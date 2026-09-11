/**
 * DRISHTI Real Drone Gateway & Telemetry Test Suite
 * =================================================
 * Validates:
 * 1. POST /api/drones/test-connection (Handshake & Reachability)
 * 2. POST /api/drones/connect (Simulation Mode Registration)
 * 3. GET /api/drones (Gateway State Retrieval)
 * 4. POST /api/drone-telemetry (Telemetry Ingestion & API Key Validation)
 * 5. WebSocket Broadcast (type: "DRONE_TELEMETRY" reception)
 * 6. POST /api/drones/disconnect (Clean Gateway Shutdown)
 */

import http from 'http';
import WebSocket from 'ws';

let totalTests = 0;
let passedTests = 0;

function assertCheck(desc, condition, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${String(totalTests).padStart(2, '0')}: ${desc}`);
    if (details) console.log(`       ↳ ${details}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${String(totalTests).padStart(2, '0')}: ${desc}`);
    if (details) console.error(`       ↳ ${details}`);
  }
}

function postJson(urlPath, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:5000${urlPath}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
  });
}

async function runRealDroneTests() {
  console.log('===============================================================');
  console.log('    DRISHTI: REAL DRONE GATEWAY VALIDATION TEST SUITE          ');
  console.log('===============================================================\n');

  // Test 1: Test Connection (Handshake)
  try {
    const testRes = await postJson('/api/drones/test-connection', {
      droneId: 'DRONE-01',
      flightController: 'Pixhawk 2.4.8',
      companionComputer: 'Jetson Orin Nano',
      jetsonIp: '192.168.1.105',
      connectionType: 'UDP',
      port: 14550
    });

    assertCheck(
      'POST /api/drones/test-connection returns valid simulated handshake',
      testRes.status === 200 && testRes.data?.success === true && testRes.data?.status === 'READY_FOR_AGENT',
      `Status: ${testRes.data?.status}, Mode: ${testRes.data?.mode}`
    );
  } catch (err) {
    assertCheck('POST /api/drones/test-connection', false, err.message);
  }

  // Test 2: Connect Drone in Simulation Mode
  try {
    const connRes = await postJson('/api/drones/connect', {
      droneId: 'DRONE-01',
      flightController: 'Pixhawk 2.4.8',
      companionComputer: 'Jetson Orin Nano',
      jetsonIp: '192.168.1.105',
      connectionType: 'UDP',
      port: 14550
    });

    assertCheck(
      'POST /api/drones/connect registers gateway in SIMULATION mode',
      connRes.status === 200 && (connRes.data?.status === 'CONFIGURED' || connRes.data?.status === 'CONNECTED') && connRes.data?.mode === 'SIMULATION',
      `Drone: ${connRes.data?.config?.droneId}, Controller: ${connRes.data?.config?.flightController}, Status: ${connRes.data?.status}`
    );
  } catch (err) {
    assertCheck('POST /api/drones/connect', false, err.message);
  }

  // Test 3: Retrieve Drone Status via GET /api/drones
  try {
    const getRes = await getJson('/api/drones');
    assertCheck(
      'GET /api/drones returns active gateway status',
      getRes.status === 200 && getRes.data?.connected === true && getRes.data?.activeDrone?.droneId === 'DRONE-01',
      `Status: ${getRes.data?.status}, Mode: ${getRes.data?.mode}`
    );
  } catch (err) {
    assertCheck('GET /api/drones', false, err.message);
  }

  // Test 4: Telemetry Authentication Rejection (Unauthorized request)
  try {
    const unauthRes = await postJson('/api/drone-telemetry', {
      droneId: 'DRONE-01',
      latitude: 13.0827,
      longitude: 80.2707,
      altitude: 100,
      speed: 12,
      battery: 78
    }, {
      'x-drone-api-key': 'invalid-secret-key'
    });

    const noKeyRes = await postJson('/api/drone-telemetry', {
      droneId: 'DRONE-01',
      latitude: 13.0827,
      longitude: 80.2707,
      altitude: 100,
      speed: 12,
      battery: 78
    }, {});

    const oldHardcodedSecretRes = await postJson('/api/drone-telemetry', {
      droneId: 'DRONE-01',
      latitude: 13.0827,
      longitude: 80.2707,
      altitude: 100,
      speed: 12,
      battery: 78
    }, {
      'x-drone-api-key': 'drishti-drone-secret-key-2025'
    });

    assertCheck(
      'POST /api/drone-telemetry rejects unauthorized request with HTTP 401 (including old fallback secret)',
      unauthRes.status === 401 && noKeyRes.status === 401 && oldHardcodedSecretRes.status === 401,
      `Invalid: ${unauthRes.status}, Missing: ${noKeyRes.status}, Old hardcoded: ${oldHardcodedSecretRes.status}`
    );
  } catch (err) {
    assertCheck('POST /api/drone-telemetry authentication rejection', false, err.message);
  }

  // Test 5 & 6: Telemetry Ingestion & WebSocket Broadcast
  try {
    let wsReceivedTelemetry = false;
    let receivedPayload = null;

    const wsPromise = new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:5000');
      const timer = setTimeout(() => {
        ws.close();
        resolve();
      }, 3000);

      ws.on('open', async () => {
        // Send telemetry with valid authentication header
        const validKey = process.env.DRONE_API_KEY || 'test-env-drone-key';
        await postJson('/api/drone-telemetry', {
          droneId: 'DRONE-01',
          latitude: 13.0827,
          longitude: 80.2707,
          altitude: 100,
          speed: 12,
          battery: 78,
          gps: true,
          armed: false,
          flightMode: 'GUIDED'
        }, {
          'x-drone-api-key': validKey
        });
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'DRONE_TELEMETRY' && msg.data?.droneId === 'DRONE-01') {
            wsReceivedTelemetry = true;
            receivedPayload = msg.data;
            clearTimeout(timer);
            ws.close();
            resolve();
          }
        } catch (e) {}
      });
    });

    await wsPromise;

    assertCheck(
      'POST /api/drone-telemetry accepts authenticated telemetry payload (HTTP 200)',
      receivedPayload !== null,
      `Altitude: ${receivedPayload?.altitude}m, Battery: ${receivedPayload?.battery}%`
    );

    assertCheck(
      'WebSocket server broadcasts DRONE_TELEMETRY message to connected clients',
      wsReceivedTelemetry === true,
      `Received Drone: ${receivedPayload?.droneId}, Mode: ${receivedPayload?.flightMode}`
    );
  } catch (err) {
    assertCheck('WebSocket DRONE_TELEMETRY broadcast', false, err.message);
  }

    // Test 7: Hardware Bench Test Endpoint
    try {
      const benchRes = await postJson('/api/drone-bench-test', {
        droneId: 'DRONE-01',
        latitude: 13.0827,
        longitude: 80.2707,
        altitude: 45,
        speed: 8.5,
        battery: 92,
        gps: true,
        armed: true,
        flightMode: 'GUIDED'
      });

      assertCheck(
        'POST /api/drone-bench-test accepts bench telemetry without requiring device key',
        benchRes.status === 200 && benchRes.data?.success === true && benchRes.data?.mode === 'BENCH_TEST',
        `Mode: ${benchRes.data?.mode}, Clients Notified: ${benchRes.data?.clientsNotified}`
      );
    } catch (err) {
      assertCheck('POST /api/drone-bench-test', false, err.message);
    }

    // Test 8: Disconnect Drone Cleanly
    try {
      const disconnRes = await postJson('/api/drones/disconnect', {});
      assertCheck(
        'POST /api/drones/disconnect resets gateway status to DISCONNECTED',
        disconnRes.status === 200 && disconnRes.data?.status === 'DISCONNECTED',
        disconnRes.data?.message
      );
    } catch (err) {
      assertCheck('POST /api/drones/disconnect', false, err.message);
    }

  // Test 9: Verify Existing MATLAB Simulation Still Works
  try {
    const matlabPayload = {
      simulation_step: 99,
      drones: [
        { id: 1, name: "DRONE-01", x: 705, y: 705, altitude: 100, speed: 10, battery: 89, available: true, status: "SEARCHING" },
        { id: 2, name: "DRONE-02", x: -415, y: 1125, altitude: 100, speed: 12, battery: 84, available: true, status: "SEARCHING" }
      ],
      victims: [
        { id: 1, name: "V-1", x: 650, y: 750, priority: "HIGH", status: "ASSIGNED", assignedDrone: 1 }
      ],
      rescue: { target_victim: 1, priority: "HIGH", assigned_drone: 1, distance: 68.2, battery: 89 },
      alerts: [
        { type: "HIGH", title: "HIGH PRIORITY VICTIM DETECTED", message: "Victim V-1 requires immediate rescue.", time: "Just now" }
      ]
    };

    const simPostRes = await postJson('/api/simulation-data', matlabPayload);
    const simGetRes = await getJson('/api/simulation-data');

    assertCheck(
      'Existing MATLAB simulation workflow (/api/simulation-data) remains fully operational',
      simPostRes.status === 200 && simPostRes.data?.success === true && simGetRes.data?.simulation_step === 99,
      `Simulation Step: ${simGetRes.data?.simulation_step}, Drones: ${simGetRes.data?.drones?.length}`
    );
  } catch (err) {
    assertCheck('MATLAB simulation preservation check', false, err.message);
  }

  console.log('\n===============================================================');
  console.log(`REAL DRONE VALIDATION: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRealDroneTests();
