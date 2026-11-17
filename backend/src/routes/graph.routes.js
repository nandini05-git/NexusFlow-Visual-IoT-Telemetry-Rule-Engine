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
} from '../controllers/graph.controller.js';

const router = express.Router();

// All graph routes require user authentication
router.use(requireAuth);

router.route('/')
  .post(createGraph)
  .get(getGraphs);

// Ad-hoc compile endpoint for validating current unsaved canvas graph
router.post('/compile', compileAdHocGraph);

router.route('/:id')
  .get(getGraphById)
  .put(updateGraph)
  .delete(deleteGraph);

// Dry-run compile endpoint for saved graph
router.post('/:id/compile', compileSavedGraph);

export default router;
