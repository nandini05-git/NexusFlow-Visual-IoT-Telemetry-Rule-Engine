import mongoose from 'mongoose';

const alertEventSchema = new mongoose.Schema(
  {
    graphId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RuleGraph',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ruleName: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true,
    },
    actionType: {
      type: String,
      enum: ['sms_alert', 'webhook', 'sms', 'email', 'custom'],
      default: 'sms_alert',
      index: true,
    },
    target: {
      type: String,
      trim: true,
      default: '',
    },
    reading: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Telemetry reading snapshot is required'],
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for rapid lookup by owner/graph and time
alertEventSchema.index({ owner: 1, triggeredAt: -1 });
alertEventSchema.index({ graphId: 1, triggeredAt: -1 });

const AlertEvent = mongoose.model('AlertEvent', alertEventSchema);

export default AlertEvent;
