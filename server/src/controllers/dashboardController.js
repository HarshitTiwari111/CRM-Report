const Task = require('../models/Task');
const GoogleSheetTask = require('../models/GoogleSheetTask');
const User = require('../models/User');
const Department = require('../models/Department');
const Team = require('../models/Team');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');

const startOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};
const endOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};
const startOfWeek = () => {
  const date = startOfDay();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};
const startOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const countTasks = (filter) => Task.countDocuments(filter);
const countSheetTasks = (filter) => GoogleSheetTask.countDocuments(filter);

const REPORT_ACTION_LABELS = {
  'export-report-pdf': 'PDF Report',
  'export-report-excel': 'Excel Report',
  'export-report-csv': 'CSV Report',
};

const pendingSheetStatuses = ['pending', 'assigned'];

// GET /dashboard/admin
const adminDashboard = asyncHandler(async (req, res) => {
  const today = { $gte: startOfDay(), $lte: endOfDay() };

  const [
    totalEmployees,
    totalDepartments,
    totalTeams,
    todayCount,
    completedCount,
    pendingCount,
    inProgressCount,
    lateCount,
    weeklyCount,
    monthlyCount,
    latestTasks,
    latestLogins,
    latestReportLogs,
  ] = await Promise.all([
    User.countDocuments({ role: 'employee' }),
    Department.countDocuments(),
    Team.countDocuments(),
    countTasks({ taskDate: today }),
    countTasks({ status: 'completed' }),
    countTasks({ status: 'pending' }),
    countTasks({ status: 'in-progress' }),
    countTasks({ status: { $in: ['pending', 'in-progress'] }, expectedCompletion: { $lt: new Date() } }),
    countTasks({ taskDate: { $gte: startOfWeek() } }),
    countTasks({ taskDate: { $gte: startOfMonth() } }),
    Task.find().populate('assignedTo', 'name').sort({ createdAt: -1 }).limit(5).select('title status assignedTo createdAt'),
    User.find({ lastLogin: { $exists: true, $ne: null } }).sort({ lastLogin: -1 }).limit(5).select('name lastLogin'),
    ActivityLog.find({ action: { $in: Object.keys(REPORT_ACTION_LABELS) } })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const latestReports = latestReportLogs.map((log) => ({
    _id: log._id,
    type: REPORT_ACTION_LABELS[log.action] || log.action,
    generatedBy: log.user?.name,
    createdAt: log.createdAt,
  }));

  res.json({
    success: true,
    data: {
      cards: {
        totalEmployees,
        departments: totalDepartments,
        teams: totalTeams,
        todayTasks: todayCount,
        completed: completedCount,
        pending: pendingCount,
        inProgress: inProgressCount,
        late: lateCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
      },
      recentActivity: { latestTasks, latestLogins, latestReports },
    },
  });
});

// GET /dashboard/employee
const employeeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = { $gte: startOfDay(), $lte: endOfDay() };

  const [
    totalCount,
    todayCount,
    completedCount,
    pendingCount,
    inProgressCount,
    overdueCount,
    weeklyCount,
    monthlyCount,
    recentTasks,
    recentSheetTasks,
    upcomingDeadlines,
    sheetTotalCount,
    sheetCompletedCount,
    sheetPendingCount,
    sheetInProgressCount,
    sheetTodayCount,
    sheetWeeklyCount,
    sheetMonthlyCount,
    sheetProgressStats,
  ] = await Promise.all([
    countTasks({ assignedTo: userId }),
    countTasks({ assignedTo: userId, taskDate: today }),
    countTasks({ assignedTo: userId, status: 'completed' }),
    countTasks({ assignedTo: userId, status: 'pending' }),
    countTasks({ assignedTo: userId, status: 'in-progress' }),
    countTasks({
      assignedTo: userId,
      status: { $in: ['pending', 'in-progress'] },
      expectedCompletion: { $lt: new Date() },
    }),
    countTasks({ assignedTo: userId, taskDate: { $gte: startOfWeek() } }),
    countTasks({ assignedTo: userId, taskDate: { $gte: startOfMonth() } }),
    Task.find({ assignedTo: userId })
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title project priority status createdAt updatedAt'),
    GoogleSheetTask.find({ assignedTo: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('data status progress assignedAt updatedAt rowNumber'),
    Task.find({
      assignedTo: userId,
      status: { $in: ['pending', 'in-progress'] },
      expectedCompletion: { $gte: new Date() },
    })
      .sort({ expectedCompletion: 1 })
      .limit(5)
      .select('title expectedCompletion priority'),
    countSheetTasks({ assignedTo: userId }),
    countSheetTasks({ assignedTo: userId, status: 'completed' }),
    countSheetTasks({ assignedTo: userId, status: { $in: pendingSheetStatuses } }),
    countSheetTasks({ assignedTo: userId, status: 'in-progress' }),
    countSheetTasks({ assignedTo: userId, assignedAt: today }),
    countSheetTasks({ assignedTo: userId, assignedAt: { $gte: startOfWeek() } }),
    countSheetTasks({ assignedTo: userId, assignedAt: { $gte: startOfMonth() } }),
    GoogleSheetTask.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: null, averageProgress: { $avg: '$progress' } } },
    ]),
  ]);

  const getSheetTaskTitle = (task) => {
    const entries = task.data instanceof Map ? Array.from(task.data.entries()) : Object.entries(task.data || {});
    const titleEntry =
      entries.find(([key]) => /task.?name|title|subject/i.test(key)) ||
      entries.find(([, value]) => String(value || '').trim());

    return String(titleEntry?.[1] || `Sheet row #${task.rowNumber}`).trim();
  };

  const combinedRecentTasks = [
    ...recentTasks.map((task) => task.toObject()),
    ...recentSheetTasks.map((task) => ({
      _id: task._id,
      title: getSheetTaskTitle(task),
      project: { name: 'Google Sheet Task' },
      priority: 'medium',
      status: task.status,
      progress: task.progress || 0,
      createdAt: task.assignedAt || task.createdAt,
      updatedAt: task.updatedAt,
      source: 'google-sheet',
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const totalTrackedTasks = totalCount + sheetTotalCount;
  const sheetAverageProgress = Math.round(sheetProgressStats[0]?.averageProgress || 0);

  res.json({
    success: true,
    data: {
      cards: {
        todayTasks: todayCount + sheetTodayCount,
        completed: completedCount + sheetCompletedCount,
        pending: pendingCount + sheetPendingCount,
        inProgress: inProgressCount + sheetInProgressCount,
        overdue: overdueCount,
        weeklySummary: weeklyCount + sheetWeeklyCount,
        monthlySummary: monthlyCount + sheetMonthlyCount,
        totalAssigned: totalTrackedTasks,
        averageProgress: sheetAverageProgress,
      },
      recentTasks: combinedRecentTasks,
      upcomingDeadlines,
    },
  });
});

module.exports = { adminDashboard, employeeDashboard };
