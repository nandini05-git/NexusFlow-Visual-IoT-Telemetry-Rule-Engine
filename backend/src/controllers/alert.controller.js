import AlertEvent from '../models/AlertEvent.js';

/**
 * Alert Event Controller
 *
 * Provides endpoints for retrieving triggered rule alerts.
 */

// GET /api/alerts?graphId=&limit=
export const getAlerts = async (req, res, next) => {
  try {
    const { graphId, limit } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const query = { owner: req.user._id };
    if (graphId) {
      query.graphId = graphId;
    }

    const alerts = await AlertEvent.find(query)
      .select('-__v')
      .sort({ triggeredAt: -1 })
      .limit(parsedLimit);

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};
