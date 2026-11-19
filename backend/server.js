import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import ruleRunner from './src/compiler/ruleRunner.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
export const server = http.createServer(app);

// Setup WebSocket server
export const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected to telemetry stream');

  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    message: 'Connected to NexusFlow telemetry stream',
    timestamp: new Date().toISOString(),
  }));

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
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
