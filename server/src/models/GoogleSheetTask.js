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
    rowNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

googleSheetTaskSchema.index({ config: 1, rowNumber: 1 }, { unique: true });

module.exports = mongoose.model('GoogleSheetTask', googleSheetTaskSchema);
