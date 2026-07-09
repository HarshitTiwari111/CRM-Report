const mongoose = require('mongoose');

const dailyUpdateSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0 && value.every((item) => String(item || '').trim().length > 0);
        },
        message: 'At least one work item is required',
      },
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

dailyUpdateSchema.index({ employee: 1, workDate: -1 });
dailyUpdateSchema.index({ workDate: -1 });

module.exports = mongoose.model('DailyUpdate', dailyUpdateSchema);
