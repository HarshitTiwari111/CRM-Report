const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, details = {}, ipAddress = '') => {
  try {
    await ActivityLog.create({ user: userId || null, action, details, ipAddress });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
};

module.exports = { logActivity };
