/**
 * DRISHTI WebSocket Service
 * 
 * Provides:
 * - Sub-second live telemetry stream from Backend (ws://localhost:5000)
 * - Automatic reconnection with exponential backoff
 * - Dual-mode fallback triggers when disconnected
 * - Status notifications for UI connection badges
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.url =
  import.meta.env.VITE_WS_URL ||
  "wss://drishti-dg9e.onrender.com";
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 8000;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.onData = null;
    this.onStatus = null;
    this.droneTelemetryListeners = new Set();
    this.droneGatewayListeners = new Set();
    this.isEnabled = true;
    this.status = "connecting"; // 'websocket' | 'connecting' | 'polling' | 'offline'
  }

  onDroneTelemetry(callback) {
    this.droneTelemetryListeners.add(callback);
    return () => this.droneTelemetryListeners.delete(callback);
  }

  onDroneGatewayStatus(callback) {
    this.droneGatewayListeners.add(callback);
    return () => this.droneGatewayListeners.delete(callback);
  }

  connect(onData, onStatus) {
    this.onData = onData;
    this.onStatus = onStatus;
    this.isEnabled = true;
    this._initSocket();
  }

  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (this.onStatus) {
        this.onStatus(newStatus);
      }
    }
  }

  _initSocket() {
    if (!this.isEnabled) {
      this._setStatus("polling");
      return;
    }

    this._setStatus("connecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[DRISHTI WS Client] Connected to WebSocket server at", this.url);
        this.reconnectAttempts = 0;
        this._setStatus("websocket");
        this._startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "INIT_STATE" || payload.type === "SIMULATION_UPDATE") {
            if (this.onData && payload.data) {
              this.onData(payload.data);
            }
          } else if (payload.type === "DRONE_TELEMETRY") {
            this.droneTelemetryListeners.forEach((cb) => {
              try { cb(payload.data); } catch (err) { console.error(err); }
            });
          } else if (payload.type === "DRONE_GATEWAY_STATUS") {
            this.droneGatewayListeners.forEach((cb) => {
              try { cb(payload.data); } catch (err) { console.error(err); }
            });
          }
        } catch (err) {
          console.warn("[DRISHTI WS Client] Error parsing incoming WebSocket message:", err);
        }
      };

      this.ws.onclose = (event) => {
        console.warn("[DRISHTI WS Client] WebSocket closed. Code:", event.code);
        this._stopHeartbeat();
        this._setStatus("polling");
        this._scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.warn("[DRISHTI WS Client] WebSocket connection error, activating fallback.");
        this._stopHeartbeat();
        this._setStatus("polling");
      };
    } catch (err) {
      console.warn("[DRISHTI WS Client] WebSocket initialization exception:", err);
      this._setStatus("polling");
      this._scheduleReconnect();
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 15000);
  }

  _stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  _scheduleReconnect() {
    if (!this.isEnabled) return;
    clearTimeout(this.reconnectTimer);

    // Exponential backoff: 2s, 4s, up to 8s
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.isEnabled && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
        console.log(`[DRISHTI WS Client] Attempting reconnect #${this.reconnectAttempts}...`);
        this._initSocket();
      }
    }, delay);
  }

  disconnect() {
    this.isEnabled = false;
    clearTimeout(this.reconnectTimer);
    this._stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this._setStatus("polling");
  }

  reconnect() {
    this.disconnect();
    this.isEnabled = true;
    this.reconnectAttempts = 0;
    this._initSocket();
  }
}

export const wsService = new WebSocketService();
export default wsService;
