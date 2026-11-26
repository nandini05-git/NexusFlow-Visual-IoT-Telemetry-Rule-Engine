import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import ruleRunner from './src/compiler/ruleRunner.js';
import activityTracker from './src/services/activityTracker.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
export const server = http.createServer(app);

// Setup WebSocket server
export const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const secret = process.env.JWT_SECRET || 'nexusflow_jwt_secret_key_production_random_string_2026';

  // Parse URL query parameters if present (?token=...&graphId=...)
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const token = urlObj.searchParams.get('token');
    const graphId = urlObj.searchParams.get('graphId');
    if (token) {
      try {
        const decoded = jwt.verify(token, secret);
        const userId = decoded.id || decoded.userId;
        if (userId) {
          activityTracker.registerSocket(ws, userId, graphId);
        }
      } catch {
        // Token invalid, proceed as anonymous telemetry listener
      }
    }
  } catch {
    // Malformed request URL
  }

  ws.send(
    JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      message: 'Connected to NexusFlow telemetry stream',
      timestamp: new Date().toISOString(),
    })
  );

  // Handle graph subscription messages from browser client
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'subscribeGraph' || msg.type === 'auth') {
        const token = msg.token;
        if (token) {
          try {
            const decoded = jwt.verify(token, secret);
            const userId = decoded.id || decoded.userId;
            if (userId) {
              activityTracker.registerSocket(ws, userId, msg.graphId);
              ws.send(
                JSON.stringify({
                  type: 'GRAPH_SUBSCRIBED',
                  graphId: msg.graphId,
                  timestamp: new Date().toISOString(),
                })
              );
            }
          } catch {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token for graph subscription' }));
          }
        } else if (msg.graphId && ws.ownerId) {
          activityTracker.subscribeGraph(ws, msg.graphId);
        }
      }
    } catch {
      // Ignored non-JSON messages
    }
  });

  ws.on('close', () => {
    activityTracker.unregisterSocket(ws);
  });

  ws.on('error', (err) => {
    console.error(`[WebSocket] Client error: ${err.message}`);
  });
});

// Broadcast helper for controllers
export const broadcastTelemetry = (payload) => {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

app.set('broadcastTelemetry', broadcastTelemetry);

// Start server
export const startServer = async () => {
  await connectDB();

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  NexusFlow Backend running on port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Telemetry Ingest: http://localhost:${PORT}/api/ingest`);
      console.log(`  WebSocket Server active at ws://localhost:${PORT}`);
      console.log(`===============================================`);
      resolve(server);
    });
  });
};

// Graceful shutdown handler
export const gracefulShutdown = async (signal = 'SIGINT') => {
  console.log(`\n[Shutdown] ${signal} signal received: initiating graceful shutdown...`);

  try {
    // 1. Stop all active rule runner pipelines
    ruleRunner.stopAll();
    console.log('[Shutdown] Active rule pipelines stopped.');

    // 2. Disconnect WebSocket clients
    if (wss) {
      wss.clients.forEach((client) => {
        client.close(1001, 'Server shutting down');
      });
      wss.close();
      console.log('[Shutdown] WebSocket server closed.');
    }

    // 3. Close HTTP server
    await new Promise((resolve) => {
      server.close(() => {
        console.log('[Shutdown] HTTP server closed.');
        resolve();
      });
    });

    // 4. Close MongoDB connection
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[Shutdown] MongoDB connection closed.');
    }

    console.log('[Shutdown] Graceful shutdown complete.');
  } catch (err) {
    console.error('[Shutdown Error]:', err.message);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM').then(() => process.exit(0)));
process.on('SIGINT', () => gracefulShutdown('SIGINT').then(() => process.exit(0)));

// If executed directly, start the server
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}
