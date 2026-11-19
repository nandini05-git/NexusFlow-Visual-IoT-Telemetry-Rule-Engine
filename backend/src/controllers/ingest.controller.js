import Telemetry from '../models/Telemetry.js';
import { getDBStatus } from '../config/db.js';
import { telemetryBus } from '../compiler/telemetryBus.js';

const MAX_BATCH_SIZE = 10000;

// Fast shape normalizer for batch and single ingestion
const normalizeReading = (body) => {
  if (!body || typeof body !== 'object') return null;

  const meta = body.metadata;
  const deviceId = body.deviceId || (meta && meta.deviceId);
  const sensorType = body.sensorType || (meta && meta.sensorType);
  const unit = body.unit !== undefined ? body.unit : (meta && meta.unit) || '';
  const rawValue = body.value;
  const numericValue =
    typeof rawValue === 'number'
      ? rawValue
      : rawValue !== null && rawValue !== undefined && !isNaN(Number(rawValue))
      ? Number(rawValue)
      : undefined;

  if (!deviceId || !sensorType || numericValue === undefined) {
    return null;
  }

  return {
    metadata: {
      deviceId: typeof deviceId === 'string' ? deviceId.trim() : String(deviceId),
      sensorType: typeof sensorType === 'string' ? sensorType.trim() : String(sensorType),
      unit: typeof unit === 'string' ? unit.trim() : String(unit),
    },
    value: numericValue,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
  };
};

// GET /api/health
export const getHealth = (req, res) => {
  const dbStatus = getDBStatus();
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    service: 'NexusFlow Telemetry & Rule Engine',
  });
};

// POST /api/ingest
export const ingestSingle = async (req, res, next) => {
  try {
    const normalized = normalizeReading(req.body);

    if (
      !normalized ||
      !normalized.metadata.deviceId ||
      !normalized.metadata.sensorType ||
      normalized.value === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload. deviceId, sensorType, and numeric value are required.',
      });
    }

    const reading = new Telemetry(normalized);
    const saved = await reading.save();

    // Non-blocking pipe to RxJS telemetryBus (isolated from rule execution errors)
    try {
      telemetryBus.next(saved.toObject ? saved.toObject() : saved);
    } catch (busErr) {
      console.error('[TelemetryBus Single Error]:', busErr.message);
    }

    // Broadcast if WebSocket server is attached to req.app
    const broadcastTelemetry = req.app.get('broadcastTelemetry');
    if (typeof broadcastTelemetry === 'function') {
      broadcastTelemetry({ type: 'TELEMETRY_INGEST', data: saved });
    }

    return res.status(201).json({
      success: true,
      message: 'Telemetry reading ingested successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/ingest/batch (capped at 10,000 items)
export const ingestBatch = async (req, res, next) => {
  try {
    const rawList = Array.isArray(req.body) ? req.body : req.body.readings;

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch payload must be a non-empty array of telemetry readings.',
      });
    }

    if (rawList.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Batch payload of ${rawList.length} exceeds maximum allowed limit of ${MAX_BATCH_SIZE} readings.`,
      });
    }

    const docs = [];
    const invalidItems = [];

    rawList.forEach((item, index) => {
      const normalized = normalizeReading(item);
      if (
        normalized &&
        normalized.metadata.deviceId &&
        normalized.metadata.sensorType &&
        normalized.value !== undefined
      ) {
        docs.push(normalized);
      } else {
        invalidItems.push({ index, item, reason: 'Missing deviceId, sensorType, or value' });
      }
    });

    if (docs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All items in the batch payload were invalid.',
        invalidItems,
      });
    }

    let inserted = [];
    let partialErrors = [];

    try {
      inserted = await Telemetry.insertMany(docs, { ordered: false, lean: true });
    } catch (bulkError) {
      if (bulkError.insertedDocs) {
        inserted = bulkError.insertedDocs;
      }
      if (bulkError.writeErrors) {
        partialErrors = bulkError.writeErrors.map((we) => ({
          index: we.index,
          message: we.errmsg,
        }));
      } else {
        throw bulkError;
      }
    }

    // Non-blocking batch pipe to RxJS telemetryBus (isolated from rule execution errors)
    if (Array.isArray(inserted)) {
      try {
        inserted.forEach((doc) => {
          telemetryBus.next(doc.toObject ? doc.toObject() : doc);
        });
      } catch (busErr) {
        console.error('[TelemetryBus Batch Error]:', busErr.message);
      }
    }

    const broadcastTelemetry = req.app.get('broadcastTelemetry');
    if (typeof broadcastTelemetry === 'function' && inserted.length > 0) {
      broadcastTelemetry({ type: 'TELEMETRY_BATCH_INGEST', count: inserted.length });
    }

    return res.status(201).json({
      success: true,
      message: `Batch ingestion processed: ${inserted.length} inserted.`,
      insertedCount: inserted.length,
      invalidCount: invalidItems.length,
      errorsCount: partialErrors.length,
      ...(invalidItems.length > 0 && { invalidItems }),
      ...(partialErrors.length > 0 && { partialErrors }),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/telemetry?deviceId=&sensorType=&from=&to=&limit=
export const getTelemetry = async (req, res, next) => {
  try {
    const { deviceId, sensorType, from, to, limit } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);

    const query = {};
    if (deviceId) {
      query['metadata.deviceId'] = String(deviceId).trim();
    }
    if (sensorType) {
      query['metadata.sensorType'] = String(sensorType).trim();
    }
    if (from || to) {
      query.timestamp = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          query.timestamp.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          query.timestamp.$lte = toDate;
        }
      }
    }

    const readings = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .limit(parsedLimit)
      .lean();

    return res.status(200).json({
      success: true,
      count: readings.length,
      limit: parsedLimit,
      data: readings,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/telemetry/stats?deviceId=&sensorType=&minutes=
export const getTelemetryStats = async (req, res, next) => {
  try {
    const { deviceId, sensorType, minutes } = req.query;
    const parsedMinutes = Math.min(Math.max(parseInt(minutes, 10) || 60, 1), 10080); // Default 60 min, up to 7 days
    const windowStart = new Date(Date.now() - parsedMinutes * 60 * 1000);

    const matchStage = {
      timestamp: { $gte: windowStart },
    };

    if (deviceId) {
      matchStage['metadata.deviceId'] = String(deviceId).trim();
    }
    if (sensorType) {
      matchStage['metadata.sensorType'] = String(sensorType).trim();
    }

    const aggResult = await Telemetry.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          min: { $min: '$value' },
          max: { $max: '$value' },
          avg: { $avg: '$value' },
          firstTimestamp: { $min: '$timestamp' },
          lastTimestamp: { $max: '$timestamp' },
        },
      },
    ]);

    const stats = aggResult[0] || {
      count: 0,
      min: null,
      max: null,
      avg: null,
      firstTimestamp: null,
      lastTimestamp: null,
    };

    return res.status(200).json({
      success: true,
      filter: {
        deviceId: deviceId || 'all',
        sensorType: sensorType || 'all',
        minutes: parsedMinutes,
        windowStart: windowStart.toISOString(),
        windowEnd: new Date().toISOString(),
      },
      stats: {
        count: stats.count,
        min: stats.min !== null ? Math.round(stats.min * 100) / 100 : null,
        max: stats.max !== null ? Math.round(stats.max * 100) / 100 : null,
        avg: stats.avg !== null ? Math.round(stats.avg * 100) / 100 : null,
        firstTimestamp: stats.firstTimestamp,
        lastTimestamp: stats.lastTimestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};
