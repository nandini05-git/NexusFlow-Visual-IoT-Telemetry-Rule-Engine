import mongoose from 'mongoose';

/**
 * DeliveryLog Schema
 * Tracks outbound webhook and SMS alert dispatches, including
 * status, retry attempts, SSRF interceptions, and response codes.
 */
const deliveryLogSchema = new mongoose.Schema(
  {
    graphId: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      index: true,
    },
    nodeId: {
      type: String,
      required: true,
      trim: true,
    },
    ruleName: {
      type: String,
      default: 'NexusFlow Rule',
      trim: true,
    },
    actionType: {
      type: String,
      enum: ['webhook', 'sms', 'sms_alert', 'email', 'custom'],
      required: true,
      index: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'retrying', 'blocked'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    responseStatus: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: null,
    },
    executionTimeMs: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user delivery logs sorted newest first
deliveryLogSchema.index({ owner: 1, sentAt: -1 });
deliveryLogSchema.index({ graphId: 1, sentAt: -1 });

const DeliveryLog = mongoose.model('DeliveryLog', deliveryLogSchema);

export default DeliveryLog;
