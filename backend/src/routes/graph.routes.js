import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createGraph,
  getGraphs,
  getGraphById,
  updateGraph,
  deleteGraph,
  compileSavedGraph,
  compileAdHocGraph,
  activateGraph,
  deactivateGraph,
  getActiveGraphs,
} from '../controllers/graph.controller.js';

const router = express.Router();

// All graph routes require user authentication
router.use(requireAuth);

router.route('/').post(createGraph).get(getGraphs);

// Active running graphs for authenticated user (placed before /:id)
router.get('/active', getActiveGraphs);

// Ad-hoc compile endpoint for validating current unsaved canvas graph
router.post('/compile', compileAdHocGraph);

router.route('/:id').get(getGraphById).put(updateGraph).delete(deleteGraph);

// Dry-run compile endpoint for saved graph
router.post('/:id/compile', compileSavedGraph);

// Activate / Deactivate running state
router.post('/:id/activate', activateGraph);
router.post('/:id/deactivate', deactivateGraph);

export default router;
