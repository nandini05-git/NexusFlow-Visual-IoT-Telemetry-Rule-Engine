import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import ingestRoutes from './routes/ingest.routes.js';
import graphRoutes from './routes/graph.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: '*', // Allow frontend development requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // Skip logging high-volume batch load test in stdout to keep logs clean
    if (req.originalUrl !== '/api/ingest/batch') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    }
    next();
  });
}

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NexusFlow API',
    version: '1.0.0',
    description: 'Visual IoT Telemetry & Rule Engine API',
    endpoints: {
      health: 'GET /api/health',
      authRegister: 'POST /api/auth/register',
      authLogin: 'POST /api/auth/login',
      authMe: 'GET /api/auth/me',
      ingest: 'POST /api/ingest',
      ingestBatch: 'POST /api/ingest/batch',
      telemetry: 'GET /api/telemetry?deviceId=&sensorType=&from=&to=&limit= (Protected)',
      telemetryStats: 'GET /api/telemetry/stats?deviceId=&minutes= (Protected)',
      graphs: 'GET,POST /api/graphs (Protected)',
      graphDetail: 'GET,PUT,DELETE /api/graphs/:id (Protected)',
      graphCompile: 'POST /api/graphs/:id/compile (Protected)',
    },
  });
});

// Auth, Ingestion, and Rule Graph routes
app.use('/api/auth', authRoutes);
app.use('/api', ingestRoutes);
app.use('/api/graphs', graphRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
