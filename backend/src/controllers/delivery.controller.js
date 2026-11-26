import DeliveryLog from '../models/DeliveryLog.js';
import { testAction } from '../services/actionDispatcher.js';

/**
 * Delivery Controller
 * Handles querying delivery history and executing manual action tests.
 */

// GET /api/deliveries (Protected)
export const getDeliveries = async (req, res, next) => {
  try {
    const { graphId, status, limit = 50, page = 1 } = req.query;
    const query = { owner: req.user._id };

    if (graphId) {
      query.graphId = graphId;
    }
    if (status) {
      query.status = status;
    }

    const maxLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const skip = (pageNum - 1) * maxLimit;

    const [deliveries, total] = await Promise.all([
      DeliveryLog.find(query)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(maxLimit)
        .lean(),
      DeliveryLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      deliveries,
      pagination: {
        total,
        page: pageNum,
        limit: maxLimit,
        pages: Math.ceil(total / maxLimit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/actions/test (Protected)
export const runTestAction = async (req, res, next) => {
  try {
    const { actionType, target, payload } = req.body;

    if (!actionType) {
      return res.status(400).json({ error: 'Validation Error', details: 'actionType is required (webhook or sms)' });
    }
    if (!target) {
      return res.status(400).json({ error: 'Validation Error', details: 'target URL or phone number is required' });
    }

    const result = await testAction({ actionType, target, payload });

    if (result.status === 'blocked') {
      return res.status(400).json({
        success: false,
        status: 'blocked',
        error: result.error,
        details: 'SSRF Protection: Delivery to private/local destinations is strictly forbidden.',
      });
    }

    return res.json({
      success: result.success,
      status: result.status,
      attempts: result.attempts,
      responseStatus: result.responseStatus,
      responseBody: result.responseBody,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
    });
  } catch (err) {
    next(err);
  }
};
