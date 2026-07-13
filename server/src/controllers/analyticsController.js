const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');

const DATE_FORMATS = {
  daily: '%Y-%m-%d',
  weekly: '%Y-%U',
  monthly: '%Y-%m',
};

// GET /analytics/productivity?range=daily|weekly|monthly
const productivity = asyncHandler(async (req, res) => {
  const range = ['daily', 'weekly', 'monthly'].includes(req.query.range) ? req.query.range : 'daily';
  const format = DATE_FORMATS[range];

  const daysBack = range === 'daily' ? 30 : range === 'weekly' ? 90 : 365;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const data = await Task.aggregate([
    { $match: { taskDate: { $gte: since }, isArchived: { $ne: true } } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$taskDate' } },
        totalTasks: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalHours: { $sum: '$totalHours' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: data.map((d) => ({
      period: d._id,
      totalTasks: d.totalTasks,
      completed: d.completed,
      totalHours: Math.round(d.totalHours * 100) / 100,
    })),
  });
});

// GET /analytics/department-performance
const departmentPerformance = asyncHandler(async (req, res) => {
  const data = await Task.aggregate([
    { $match: { department: { $ne: null }, isArchived: { $ne: true } } },
    {
      $group: {
        _id: '$department',
        totalTasks: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalHours: { $sum: '$totalHours' },
      },
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        departmentId: '$_id',
        departmentName: '$department.name',
        totalTasks: 1,
        completed: 1,
        totalHours: { $round: ['$totalHours', 2] },
        completionRate: {
          $cond: [
            { $eq: ['$totalTasks', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$completed', '$totalTasks'] }, 100] }, 2] },
          ],
        },
      },
    },
    { $sort: { totalTasks: -1 } },
  ]);

  res.json({ success: true, data });
});

// GET /analytics/employee-performance
const employeePerformance = asyncHandler(async (req, res) => {
  const data = await Task.aggregate([
    { $match: { isArchived: { $ne: true } } },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalHours: { $sum: '$totalHours' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $project: {
        _id: 0,
        employeeId: '$_id',
        name: '$employee.name',
        email: '$employee.email',
        totalTasks: 1,
        completed: 1,
        totalHours: { $round: ['$totalHours', 2] },
        completionRate: {
          $cond: [
            { $eq: ['$totalTasks', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$completed', '$totalTasks'] }, 100] }, 2] },
          ],
        },
      },
    },
    { $sort: { totalTasks: -1 } },
  ]);

  res.json({ success: true, data });
});

// GET /analytics/top-performers
const topPerformers = asyncHandler(async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 5);

  const data = await Task.aggregate([
    { $match: { status: 'completed', isArchived: { $ne: true } } },
    {
      $group: {
        _id: '$assignedTo',
        completedTasks: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
      },
    },
    { $sort: { completedTasks: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $project: {
        _id: 0,
        employeeId: '$_id',
        name: '$employee.name',
        email: '$employee.email',
        completedTasks: 1,
        totalHours: { $round: ['$totalHours', 2] },
      },
    },
  ]);

  res.json({ success: true, data });
});

// GET /analytics/completion-trend
const completionTrend = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const data = await Task.aggregate([
    { $match: { taskDate: { $gte: since }, isArchived: { $ne: true } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$taskDate' } },
        totalTasks: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        totalTasks: 1,
        completed: 1,
        completionRate: {
          $cond: [
            { $eq: ['$totalTasks', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$completed', '$totalTasks'] }, 100] }, 2] },
          ],
        },
      },
    },
    { $sort: { date: 1 } },
  ]);

  res.json({ success: true, data });
});

module.exports = {
  productivity,
  departmentPerformance,
  employeePerformance,
  topPerformers,
  completionTrend,
};
