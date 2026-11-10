import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ingestRoutes from './routes/ingest.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow frontend development requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
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
      ingest: 'POST /api/ingest',
      ingestBatch: 'POST /api/ingest/batch',
      telemetry: 'GET /api/telemetry?deviceId=&limit=',
    },
  });
});

// API routes
app.use('/api', ingestRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
