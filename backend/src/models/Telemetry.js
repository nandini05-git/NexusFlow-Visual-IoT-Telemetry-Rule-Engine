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

telemetrySchema.index({ 'metadata.deviceId': 1, timestamp: -1 });

const Telemetry = mongoose.model('Telemetry', telemetrySchema);

export default Telemetry;
