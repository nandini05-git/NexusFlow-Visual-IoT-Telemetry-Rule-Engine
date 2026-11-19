import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    metadata: {
      deviceId: {
        type: String,
        required: [true, 'deviceId is required'],
        trim: true,
      },
      sensorType: {
        type: String,
        required: [true, 'sensorType is required'],
        trim: true,
      },
      unit: {
        type: String,
        default: '',
        trim: true,
      },
    },
    value: {
      type: Number,
      required: [true, 'value is required'],
    },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds',
    },
  }
);

// Streamlined compound indexes:
// The compound index on (deviceId, sensorType, timestamp) covers queries by deviceId,
// as well as queries by (deviceId + sensorType), without redundant single-field indexes.
telemetrySchema.index({ 'metadata.deviceId': 1, 'metadata.sensorType': 1, timestamp: -1 });
telemetrySchema.index({ 'metadata.sensorType': 1, timestamp: -1 });

const Telemetry = mongoose.model('Telemetry', telemetrySchema);

export default Telemetry;
