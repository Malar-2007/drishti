/**
 * DRISHTI SIH Backend Server
 * 
 * Provides:
 * - Express HTTP API (Port 5000)
 * - WebSocket Server for sub-second real-time telemetry push
 * - Ingestion endpoint (POST /api/simulation-data) for MATLAB / simulator
 * - Bidirectional synchronization with public/data/rescue_results.json backup
 * - File watcher to broadcast changes if MATLAB writes directly to disk
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 5000;
const dataDir = path.join(projectRoot, 'public', 'data');
const jsonFilePath = path.join(dataDir, 'rescue_results.json');
const tempFilePath = path.join(dataDir, 'rescue_results_temp.json');

// Ensure public/data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory simulation state cache
let latestState = null;

// In-memory Real Drone Gateway State (Feature 1, 2, 3, 5, 7)
let connectedDroneConfig = null;
let droneConnectionStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTED' | 'TESTING'
let droneConnectionMode = 'SIMULATION'; // Explicit simulation / bench-test mode
let latestDroneTelemetry = null;
const DRONE_API_KEY = process.env.DRONE_API_KEY;

// Initial state load from JSON file if present
if (fs.existsSync(jsonFilePath)) {
  try {
    const raw = fs.readFileSync(jsonFilePath, 'utf-8');
    latestState = JSON.parse(raw);
    console.log('[DRISHTI Backend] Initial state loaded from JSON backup.');
  } catch (err) {
    console.warn('[DRISHTI Backend] Could not read initial JSON state:', err.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * Broadcast payload to all connected WebSocket clients
 */
function broadcast(payload) {
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let activeClients = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      activeClients++;
    }
  });

  return activeClients;
}

/**
 * Safely persist simulation state to public/data/rescue_results.json
 */
function persistStateToFile(state) {
  try {
    const jsonStr = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempFilePath, jsonStr, 'utf-8');
    fs.renameSync(tempFilePath, jsonFilePath);
  } catch (err) {
    console.error('[DRISHTI Backend] Error persisting state to file:', err.message);
  }
}

// --- REST API ENDPOINTS ---

// Health & connection status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    system: 'DRISHTI Decision Support Backend',
    connectedClients: wss.clients.size,
    hasActiveState: latestState !== null,
    timestamp: new Date().toISOString()
  });
});

// Get current simulation state
app.get('/api/simulation-data', (req, res) => {
  if (latestState) {
    res.json(latestState);
  } else if (fs.existsSync(jsonFilePath)) {
    res.sendFile(jsonFilePath);
  } else {
    res.status(404).json({ error: 'No simulation data available yet' });
  }
});

// Receive live telemetry from MATLAB or companion simulator
app.post('/api/simulation-data', (req, res) => {
  const incomingData = req.body;

  // Validate incoming payload
  if (!incomingData || !Array.isArray(incomingData.drones) || !Array.isArray(incomingData.victims)) {
    return res.status(400).json({ error: 'Invalid simulation payload: drones and victims arrays are required' });
  }

  // Update in-memory state
  latestState = {
    ...incomingData,
    serverTimestamp: Date.now()
  };

  // Broadcast to all WebSocket clients instantly
  const clientsNotified = broadcast({
    type: 'SIMULATION_UPDATE',
    data: latestState
  });

  // Persist to backup JSON asynchronously
  persistStateToFile(latestState);

  res.json({
    success: true,
    clientsNotified,
    step: incomingData.simulation_step || 0
  });
});

// --- REAL DRONE GATEWAY REST APIS (Pixhawk + Jetson Orin Nano) ---

// GET /api/drones - Retrieve current drone connectivity and active telemetry
app.get('/api/drones', (req, res) => {
  res.json({
    status: droneConnectionStatus,
    mode: droneConnectionMode,
    connected: droneConnectionStatus === 'CONFIGURED' || droneConnectionStatus === 'CONNECTED' || droneConnectionStatus === 'BENCH_TEST_ACTIVE',
    activeDrone: connectedDroneConfig,
    latestTelemetry: latestDroneTelemetry,
    serverTimestamp: new Date().toISOString()
  });
});

// POST /api/drones/test-connection - Test MAVLink reachability to Jetson companion gateway
app.post('/api/drones/test-connection', (req, res) => {
  // Return honest simulation status (do not claim physical handshake)
  res.json({
    success: true,
    status: 'READY_FOR_AGENT',
    mode: 'SIMULATION',
    message: 'Simulation endpoint ready. Awaiting outbound telemetry from Jetson Orin Nano Drone Agent.'
  });
});

// POST /api/drones/connect - Register drone connection in SIMULATION mode
app.post('/api/drones/connect', (req, res) => {
  const { droneId, flightController, companionComputer, jetsonIp, connectionType, port } = req.body || {};

  connectedDroneConfig = {
    droneId: droneId || 'DRONE-01',
    flightController: flightController || 'Pixhawk 2.4.8',
    companionComputer: companionComputer || 'Jetson Orin Nano',
    jetsonIp: jetsonIp || '192.168.1.105',
    protocol: 'MAVLink',
    connectionType: connectionType || 'UDP',
    port: port || 14550,
    configuredAt: new Date().toISOString()
  };

  droneConnectionStatus = 'CONFIGURED';
  droneConnectionMode = 'SIMULATION'; // Honest: physical hardware not claimed

  // Broadcast gateway status to all connected WebSocket clients
  broadcast({
    type: 'DRONE_GATEWAY_STATUS',
    data: {
      status: droneConnectionStatus,
      mode: droneConnectionMode,
      config: connectedDroneConfig,
      telemetry: latestDroneTelemetry
    }
  });

  res.json({
    success: true,
    status: 'CONFIGURED',
    mode: 'SIMULATION',
    message: 'Drone gateway configured. Waiting for MAVLink telemetry.',
    config: connectedDroneConfig
  });
});

// POST /api/drones/disconnect - Cleanly disconnect drone gateway
app.post('/api/drones/disconnect', (req, res) => {
  const prevId = connectedDroneConfig?.droneId || 'DRONE-01';
  droneConnectionStatus = 'DISCONNECTED';
  connectedDroneConfig = null;
  latestDroneTelemetry = null;

  broadcast({
    type: 'DRONE_GATEWAY_STATUS',
    data: {
      status: droneConnectionStatus,
      mode: droneConnectionMode,
      config: null,
      telemetry: null
    }
  });

  res.json({
    success: true,
    status: 'DISCONNECTED',
    message: `Drone ${prevId} disconnected cleanly from DRISHTI Cloud Gateway.`
  });
});

// POST /api/drone-bench-test - Bench-test telemetry streamer for React UI (No private device key needed)
app.post('/api/drone-bench-test', (req, res) => {
  const incoming = req.body || {};
  const telemetry = {
    droneId: incoming.droneId || connectedDroneConfig?.droneId || 'DRONE-01',
    latitude: typeof incoming.latitude === 'number' ? incoming.latitude : 13.0827,
    longitude: typeof incoming.longitude === 'number' ? incoming.longitude : 80.2707,
    altitude: typeof incoming.altitude === 'number' ? incoming.altitude : 100,
    speed: typeof incoming.speed === 'number' ? incoming.speed : 12,
    battery: typeof incoming.battery === 'number' ? Math.min(100, Math.max(0, incoming.battery)) : 78,
    gps: incoming.gps !== false,
    armed: Boolean(incoming.armed),
    flightMode: incoming.flightMode || 'GUIDED',
    connectionType: incoming.connectionType || connectedDroneConfig?.connectionType || 'UDP',
    jetsonIp: incoming.jetsonIp || connectedDroneConfig?.jetsonIp || '192.168.1.105',
    isBenchTest: true,
    timestamp: new Date().toLocaleTimeString()
  };

  latestDroneTelemetry = telemetry;
  droneConnectionStatus = 'BENCH_TEST_ACTIVE';

  const clientsNotified = broadcast({
    type: 'DRONE_TELEMETRY',
    data: telemetry
  });

  res.json({
    success: true,
    mode: 'BENCH_TEST',
    clientsNotified,
    telemetry
  });
});

// POST /api/drone-telemetry - Ingest real/agent telemetry & broadcast via WebSocket
app.post('/api/drone-telemetry', (req, res) => {
  // Device API Key authentication (Strict: requires configured DRONE_API_KEY environment variable)
  const apiKey = req.headers['x-drone-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!DRONE_API_KEY || !apiKey || apiKey !== DRONE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid DRISHTI Drone API Key' });
  }

  const incoming = req.body;
  if (!incoming) {
    return res.status(400).json({ error: 'Missing telemetry payload' });
  }

  const telemetry = {
    droneId: incoming.droneId || connectedDroneConfig?.droneId || 'DRONE-01',
    latitude: typeof incoming.latitude === 'number' ? incoming.latitude : 13.0827,
    longitude: typeof incoming.longitude === 'number' ? incoming.longitude : 80.2707,
    altitude: typeof incoming.altitude === 'number' ? incoming.altitude : 100,
    speed: typeof incoming.speed === 'number' ? incoming.speed : 12,
    battery: typeof incoming.battery === 'number' ? Math.min(100, Math.max(0, incoming.battery)) : 78,
    gps: incoming.gps !== false,
    armed: Boolean(incoming.armed),
    flightMode: incoming.flightMode || 'GUIDED',
    connectionType: incoming.connectionType || connectedDroneConfig?.connectionType || 'UDP',
    jetsonIp: incoming.jetsonIp || connectedDroneConfig?.jetsonIp || '192.168.1.105',
    timestamp: incoming.timestamp || new Date().toLocaleTimeString()
  };

  latestDroneTelemetry = telemetry;
  if (droneConnectionStatus === 'CONFIGURED' || droneConnectionStatus === 'DISCONNECTED') {
    droneConnectionStatus = 'CONNECTED';
  }

  // Broadcast to all WebSocket clients instantly using required message type
  const clientsNotified = broadcast({
    type: 'DRONE_TELEMETRY',
    data: telemetry
  });

  res.json({
    success: true,
    clientsNotified,
    telemetry
  });
});

// --- WEBSOCKET CONNECTION LIFECYCLE ---

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[DRISHTI WS] Client connected from ${clientIp}. Total active clients: ${wss.clients.size}`);

  // Send current state immediately on connection
  if (latestState) {
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      data: latestState
    }));
  }

  // Send drone gateway state if active
  if (connectedDroneConfig || latestDroneTelemetry) {
    ws.send(JSON.stringify({
      type: 'DRONE_GATEWAY_STATUS',
      data: {
        status: droneConnectionStatus,
        mode: droneConnectionMode,
        config: connectedDroneConfig,
        telemetry: latestDroneTelemetry
      }
    }));
  }

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // ignore non-JSON messages
    }
  });

  ws.on('close', () => {
    console.log(`[DRISHTI WS] Client disconnected. Total active clients: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.warn('[DRISHTI WS] Client connection error:', err.message);
  });
});

// --- FILE WATCHER FOR DIRECT MATLAB FILE WRITES ---
// If MATLAB writes directly to public/data/rescue_results.json without HTTP,
// the watcher detects the change and pushes it via WebSocket automatically!
let watchDebounceTimer = null;
if (fs.existsSync(dataDir)) {
  fs.watch(dataDir, (eventType, filename) => {
    if (filename === 'rescue_results.json') {
      clearTimeout(watchDebounceTimer);
      watchDebounceTimer = setTimeout(() => {
        try {
          if (fs.existsSync(jsonFilePath)) {
            const content = fs.readFileSync(jsonFilePath, 'utf-8');
            const parsed = JSON.parse(content);
            latestState = parsed;
            broadcast({
              type: 'SIMULATION_UPDATE',
              data: latestState
            });
          }
        } catch (err) {
          // File might be mid-atomic rename, ignore transient read error
        }
      }, 80);
    }
  });
}

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'DRISHTI SIH Backend',
    message: 'Backend is running successfully'
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================================');
  console.log(`  DRISHTI SIH BACKEND ACTIVE ON PORT ${PORT}`);
  console.log(`  WebSocket Server ready on PORT ${PORT}`);
  console.log('===========================================================');
});
