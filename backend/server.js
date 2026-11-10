import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ server });

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
const broadcastTelemetry = (payload) => {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

app.set('broadcastTelemetry', broadcastTelemetry);

// Start server
const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  NexusFlow Backend running on port ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  Telemetry Ingest: http://localhost:${PORT}/api/ingest`);
    console.log(`  WebSocket Server active at ws://localhost:${PORT}`);
    console.log(`===============================================`);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

startServer();
