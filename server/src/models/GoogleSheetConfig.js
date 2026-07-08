const mongoose = require('mongoose');

const googleSheetConfigSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Tasks Sheet' },
    url: { type: String, required: true },
    headers: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date },
    syncError: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GoogleSheetConfig', googleSheetConfigSchema);
