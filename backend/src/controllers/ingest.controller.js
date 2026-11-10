import Telemetry from '../models/Telemetry.js';
import { getDBStatus } from '../config/db.js';

// Helper to normalize flat or nested payloads
const normalizeReading = (body) => {
  if (!body || typeof body !== 'object') return null;

  const metadata = body.metadata || {};
  const deviceId = body.deviceId || metadata.deviceId;
  const sensorType = body.sensorType || metadata.sensorType;
  const unit = body.unit !== undefined ? body.unit : (metadata.unit || '');
  const rawValue = body.value;
  const numericValue = typeof rawValue === 'number' ? rawValue : (rawValue !== null && rawValue !== undefined && !isNaN(Number(rawValue)) ? Number(rawValue) : undefined);

  return {
    metadata: {
      deviceId: deviceId !== undefined && deviceId !== null ? String(deviceId).trim() : undefined,
      sensorType: sensorType !== undefined && sensorType !== null ? String(sensorType).trim() : undefined,
      unit: unit !== undefined && unit !== null ? String(unit).trim() : '',
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

    if (!normalized || !normalized.metadata.deviceId || !normalized.metadata.sensorType || normalized.value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload. deviceId, sensorType, and numeric value are required.',
      });
    }

    const reading = new Telemetry(normalized);
    const saved = await reading.save();

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

// POST /api/ingest/batch
export const ingestBatch = async (req, res, next) => {
  try {
    const rawList = Array.isArray(req.body) ? req.body : req.body.readings;

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch payload must be a non-empty array of telemetry readings.',
      });
    }

    const docs = [];
    const invalidItems = [];

    rawList.forEach((item, index) => {
      const normalized = normalizeReading(item);
      if (normalized && normalized.metadata.deviceId && normalized.metadata.sensorType && normalized.value !== undefined) {
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
      inserted = await Telemetry.insertMany(docs, { ordered: false });
    } catch (bulkError) {
      // If ordered: false, some may succeed while others fail
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

// GET /api/telemetry?deviceId=&limit=
export const getTelemetry = async (req, res, next) => {
  try {
    const { deviceId, limit } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);

    const query = {};
    if (deviceId) {
      query['metadata.deviceId'] = String(deviceId).trim();
    }

    const readings = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .limit(parsedLimit)
      .lean();

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    next(error);
  }
};
