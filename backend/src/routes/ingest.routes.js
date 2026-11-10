import express from 'express';
import {
  getHealth,
  ingestSingle,
  ingestBatch,
  getTelemetry,
} from '../controllers/ingest.controller.js';

const router = express.Router();

// Health check
router.get('/health', getHealth);

// Ingestion endpoints
router.post('/ingest', ingestSingle);
router.post('/ingest/batch', ingestBatch);

// Telemetry query endpoint
router.get('/telemetry', getTelemetry);

export default router;
