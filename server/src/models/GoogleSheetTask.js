const mongoose = require('mongoose');

const googleSheetTaskSchema = new mongoose.Schema(
  {
    config: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoogleSheetConfig',
      required: true,
    },
    data: {
      type: Map,
      of: String,
      default: {},
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignmentSource: {
      type: String,
      enum: ['admin', 'employee'],
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in-progress', 'completed', 'hold', 'cancelled'],
      default: 'pending',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    rowNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

googleSheetTaskSchema.index({ config: 1, rowNumber: 1 }, { unique: true });
googleSheetTaskSchema.index({ config: 1, assignedTo: 1 });
googleSheetTaskSchema.index({ config: 1, status: 1 });

module.exports = mongoose.model('GoogleSheetTask', googleSheetTaskSchema);
