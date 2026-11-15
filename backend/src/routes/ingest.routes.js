import express from 'express';
import {
  getHealth,
  ingestSingle,
  ingestBatch,
  getTelemetry,
  getTelemetryStats,
} from '../controllers/ingest.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { optionalApiKeyCheck } from '../middleware/apiKeyAuth.js';

const router = express.Router();

// System health check (public)
router.get('/health', getHealth);

// Ingestion endpoints (device facing, optional x-api-key check)
router.post('/ingest', optionalApiKeyCheck, ingestSingle);
router.post('/ingest/batch', optionalApiKeyCheck, ingestBatch);

// Telemetry aggregation and query endpoints (protected by JWT auth)
router.get('/telemetry/stats', requireAuth, getTelemetryStats);
router.get('/telemetry', requireAuth, getTelemetry);

export default router;
