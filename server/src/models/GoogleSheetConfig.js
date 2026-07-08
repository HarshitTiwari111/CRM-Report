const mongoose = require('mongoose');

const googleSheetConfigSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Tasks Sheet' },
    url: { type: String, required: true },
    headers: { type: [String], default: [] },
    syncMode: { type: String, enum: ['pull', 'push'], default: 'pull' },
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date },
    syncError: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GoogleSheetConfig', googleSheetConfigSchema);
