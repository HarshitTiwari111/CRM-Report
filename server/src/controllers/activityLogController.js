const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');

// GET /activity-logs
const listActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, user, action, dateFrom, dateTo } = req.query;

  const filter = {};
  if (user) {
    if (mongoose.Types.ObjectId.isValid(user)) {
      filter.user = user;
    } else {
      const users = await User.find({
        $or: [
          { name: { $regex: user, $options: 'i' } },
          { email: { $regex: user, $options: 'i' } },
          { employeeId: { $regex: user, $options: 'i' } },
        ],
      }).select('_id');
      filter.user = { $in: users.map((u) => u._id) };
    }
  }
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('user', 'name email employeeId')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: logs,
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

module.exports = { listActivityLogs };
