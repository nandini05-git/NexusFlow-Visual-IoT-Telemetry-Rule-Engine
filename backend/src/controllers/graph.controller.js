import RuleGraph from '../models/RuleGraph.js';
import { parseGraph, GraphValidationError } from '../compiler/graphParser.js';
import { compileGraph } from '../compiler/compileGraph.js';
import ruleRunner from '../compiler/ruleRunner.js';

/**
 * Graph Controller
 *
 * Provides protected CRUD and dry-run compilation for user rule graphs.
 */

// POST /api/graphs
export const createGraph = async (req, res, next) => {
  try {
    const { name, description, graph, status } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Graph name is required.',
      });
    }

    const graphPayload = graph || { version: '1.0.0', nodes: [], edges: [] };

    // Validate graph structure if nodes are provided
    if (graphPayload.nodes && graphPayload.nodes.length > 0) {
      try {
        parseGraph(graphPayload);
      } catch (valErr) {
        return res.status(400).json({
          success: false,
          message: valErr.message,
          errors: valErr.errors || [valErr.message],
        });
      }
    }

    const newGraph = new RuleGraph({
      owner: req.user._id,
      name: name.trim(),
      description: (description || '').trim(),
      graph: graphPayload,
      status: status || 'draft',
    });

    const saved = await newGraph.save();

    return res.status(201).json({
      success: true,
      message: 'Rule graph created successfully.',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/graphs
export const getGraphs = async (req, res, next) => {
  try {
    const graphs = await RuleGraph.find({ owner: req.user._id })
      .select('-__v')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: graphs.length,
      data: graphs,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/graphs/:id
export const getGraphById = async (req, res, next) => {
  try {
    const graph = await RuleGraph.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select('-__v');

    if (!graph) {
      return res.status(404).json({
        success: false,
        message: 'Rule graph not found or not owned by you.',
      });
    }

    return res.status(200).json({
      success: true,
      data: graph,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/graphs/:id
export const updateGraph = async (req, res, next) => {
  try {
    const { name, description, graph, status } = req.body;

    const existing = await RuleGraph.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Rule graph not found or not owned by you.',
      });
    }

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Graph name cannot be empty.',
        });
      }
      existing.name = name.trim();
    }

    if (description !== undefined) {
      existing.description = String(description).trim();
    }

    if (status !== undefined) {
      if (!['draft', 'active'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'draft' or 'active'.",
        });
      }
      existing.status = status;
    }

    if (graph !== undefined) {
      if (graph.nodes && graph.nodes.length > 0) {
        try {
          parseGraph(graph);
        } catch (valErr) {
          return res.status(400).json({
            success: false,
            message: valErr.message,
            errors: valErr.errors || [valErr.message],
          });
        }
      }
      existing.graph = graph;
    }

    const updated = await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Rule graph updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/graphs/:id
export const deleteGraph = async (req, res, next) => {
  try {
    const deleted = await RuleGraph.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Rule graph not found or not owned by you.',
      });
    }

    // Stop execution in ruleRunner if active
    ruleRunner.deactivate(deleted._id);

    return res.status(200).json({
      success: true,
      message: `Rule graph '${deleted.name}' deleted successfully.`,
      data: { id: deleted._id },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/graphs/:id/activate (Compile, run, and mark status "active")
export const activateGraph = async (req, res, next) => {
  try {
    const graphDoc = await RuleGraph.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!graphDoc) {
      return res.status(404).json({
        success: false,
        message: 'Rule graph not found or not owned by you.',
      });
    }

    // Compile & activate in ruleRunner (stops duplicate subscriptions if already running)
    const runResult = ruleRunner.activate(graphDoc._id, graphDoc, req.user._id);

    // Update status in MongoDB
    graphDoc.status = 'active';
    await graphDoc.save();

    return res.status(200).json({
      success: true,
      message: `Rule graph '${graphDoc.name}' activated and running.`,
      data: graphDoc,
      metadata: runResult.metadata,
      activatedAt: runResult.activatedAt,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || [error.message],
    });
  }
};

// POST /api/graphs/:id/deactivate (Stop execution and set status "draft")
export const deactivateGraph = async (req, res, next) => {
  try {
    const graphDoc = await RuleGraph.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!graphDoc) {
      return res.status(404).json({
        success: false,
        message: 'Rule graph not found or not owned by you.',
      });
    }

    // Stop in ruleRunner
    ruleRunner.deactivate(graphDoc._id);

    // Update status in MongoDB
    graphDoc.status = 'draft';
    await graphDoc.save();

    return res.status(200).json({
      success: true,
      message: `Rule graph '${graphDoc.name}' deactivated.`,
      data: graphDoc,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/graphs/active (List running graphs for authenticated user)
export const getActiveGraphs = (req, res) => {
  const activeList = ruleRunner.listActive(req.user._id);
  return res.status(200).json({
    success: true,
    count: activeList.length,
    data: activeList,
  });
};

// POST /api/graphs/:id/compile (Dry-run compile saved graph)
export const compileSavedGraph = async (req, res, next) => {
  try {
    const graphDoc = await RuleGraph.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!graphDoc) {
      return res.status(404).json({
        success: false,
        message: 'Rule graph not found or not owned by you.',
      });
    }

    try {
      const compiled = compileGraph(graphDoc.graph, { ruleName: graphDoc.name });

      return res.status(200).json({
        success: true,
        message: `Graph '${graphDoc.name}' compiled successfully into executable RxJS streams (dry-run).`,
        metadata: compiled.metadata,
      });
    } catch (compileErr) {
      return res.status(400).json({
        success: false,
        message: compileErr.message,
        errors: compileErr.errors || [compileErr.message],
      });
    }
  } catch (error) {
    next(error);
  }
};

// POST /api/graphs/compile (Dry-run compile ad-hoc/unsaved graph payload)
export const compileAdHocGraph = async (req, res, next) => {
  try {
    const { graph, name } = req.body;
    const graphPayload = graph || req.body;

    try {
      const compiled = compileGraph(graphPayload, { ruleName: name || 'Canvas Graph' });

      return res.status(200).json({
        success: true,
        message: 'Graph compiled successfully into executable RxJS streams (dry-run).',
        metadata: compiled.metadata,
      });
    } catch (compileErr) {
      return res.status(400).json({
        success: false,
        message: compileErr.message,
        errors: compileErr.errors || [compileErr.message],
      });
    }
  } catch (error) {
    next(error);
  }
};
