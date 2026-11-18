import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAlerts } from '../controllers/alert.controller.js';

const router = express.Router();

// Protected alerts route
router.get('/', requireAuth, getAlerts);

export default router;
