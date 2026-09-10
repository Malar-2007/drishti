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

server.listen(PORT, () => {
  console.log('===========================================================');
  console.log(`  DRISHTI SIH BACKEND ACTIVE ON http://localhost:${PORT}   `);
  console.log(`  WebSocket Server ready on ws://localhost:${PORT}          `);
  console.log('===========================================================');
});
