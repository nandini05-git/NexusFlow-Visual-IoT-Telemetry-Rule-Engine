import express from 'express';
import {
  getHealth,
  ingestSingle,
  ingestBatch,
  getTelemetry,
} from '../controllers/ingest.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Health check
router.get('/health', getHealth);

// Ingestion endpoints (open for IoT devices/sensors)
router.post('/ingest', ingestSingle);
router.post('/ingest/batch', ingestBatch);

// Telemetry query endpoint (protected with JWT auth)
router.get('/telemetry', requireAuth, getTelemetry);

export default router;
