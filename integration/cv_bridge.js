/**
 * DRISHTI CV to Backend Bridge
 * ----------------------------
 * Ingests detection JSON payloads produced by cv_module (OpenCV/YOLO),
 * attaches source drone telemetry, updates casualty coordinates, and
 * transmits updates to the backend at http://localhost:5000/api/simulation-data.
 */

import http from 'http';

export function pushDetectionToBackend(detectionPayload, backendPort = 5000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(detectionPayload);

    const options = {
      hostname: 'localhost',
      port: backendPort,
      path: '/api/simulation-data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// CLI usage test
if (process.argv[1] && process.argv[1].endsWith('cv_bridge.js')) {
  console.log('[DRISHTI CV Bridge] Ready for incoming detection events.');
}
