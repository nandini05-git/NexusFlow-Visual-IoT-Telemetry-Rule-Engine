import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const edgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    sourceHandle: { type: String, default: null },
    targetHandle: { type: String, default: null },
  },
  { _id: false }
);

const ruleGraphSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Graph name is required'],
      trim: true,
      maxlength: [120, 'Graph name cannot exceed 120 characters'],
      default: 'Untitled Rule',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    graph: {
      version: {
        type: String,
        default: '1.0.0',
      },
      nodes: {
        type: [nodeSchema],
        default: [],
      },
      edges: {
        type: [edgeSchema],
        default: [],
      },
    },
    status: {
      type: String,
      enum: ['draft', 'active'],
      default: 'draft',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of a user's graphs by status and update time
ruleGraphSchema.index({ owner: 1, updatedAt: -1 });

const RuleGraph = mongoose.model('RuleGraph', ruleGraphSchema);

export default RuleGraph;
