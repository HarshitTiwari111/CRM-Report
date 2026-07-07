const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'My Company',
    },
    logo: {
      type: String,
      default: '',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    officeHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
    },
    theme: {
      type: String,
      default: 'light',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
