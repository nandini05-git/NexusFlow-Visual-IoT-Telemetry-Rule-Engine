import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import ingestRoutes from './routes/ingest.routes.js';
import graphRoutes from './routes/graph.routes.js';
import alertRoutes from './routes/alert.routes.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { authLimiter, apiLimiter, ingestLimiter } from './middleware/rateLimiters.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security headers with Helmet
app.use(helmet());

// Unique Request ID & structured request duration logger
app.use(requestIdMiddleware);

// Middleware
app.use(
  cors({
    origin: '*', // Allow frontend development requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Request-Id'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      graphActivate: 'POST /api/graphs/:id/activate (Protected)',
      graphDeactivate: 'POST /api/graphs/:id/deactivate (Protected)',
      graphsActive: 'GET /api/graphs/active (Protected)',
      alerts: 'GET /api/alerts?graphId=&limit= (Protected)',
    },
  });
});

// Auth, Ingestion, Rule Graph, and Alert routes with targeted rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', ingestLimiter, ingestRoutes);
app.use('/api/graphs', apiLimiter, graphRoutes);
app.use('/api/alerts', apiLimiter, alertRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
