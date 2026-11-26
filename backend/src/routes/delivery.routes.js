import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDeliveries, runTestAction } from '../controllers/delivery.controller.js';

const router = express.Router();

// Deliveries query routes (Protected)
router.get('/deliveries', requireAuth, getDeliveries);

// Manual Action test route (Protected)
router.post('/actions/test', requireAuth, runTestAction);

export default router;
