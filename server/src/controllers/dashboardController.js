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


const manualProgressFromStatus = (status) => {
  if (status === 'completed') return 100;
  if (status === 'in-progress') return 50;
  if (status === 'hold') return 25;
  return 0;
};

const getSheetTaskTitle = (task) => {
  const entries = task.data instanceof Map ? Array.from(task.data.entries()) : Object.entries(task.data || {});
  const titleEntry =
    entries.find(([key]) => /task.?name|title|subject/i.test(key)) ||
    entries.find(([, value]) => String(value || '').trim());

  return String(titleEntry?.[1] || `Sheet row #${task.rowNumber}`).trim();
};

// GET /dashboard/admin
const adminDashboard = asyncHandler(async (req, res) => {
  const today = { $gte: startOfDay(), $lte: endOfDay() };

  const [
    totalEmployees,
    totalDepartments,
    totalTeams,
    sheetTaskCount,
    sheetCompletedCount,
    sheetPendingCount,
    sheetInProgressCount,
    sheetHoldCount,
    sheetCancelledCount,
    sheetWeeklyCount,
    sheetMonthlyCount,
    latestSheetTasks,
    manualTaskCount,
    completedCount,
    pendingCount,
    inProgressCount,
    holdCount,
    cancelledCount,
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
    countSheetTasks({}),
    countSheetTasks({ status: 'completed' }),
    countSheetTasks({ status: { $in: pendingSheetStatuses } }),
    countSheetTasks({ status: 'in-progress' }),
    countSheetTasks({ status: 'hold' }),
    countSheetTasks({ status: 'cancelled' }),
    countSheetTasks({ createdAt: { $gte: startOfWeek() } }),
    countSheetTasks({ createdAt: { $gte: startOfMonth() } }),
    GoogleSheetTask.find()
      .populate('assignedTo', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('data status assignedTo rowNumber updatedAt createdAt'),
    countTasks({}),
    countTasks({ status: 'completed' }),
    countTasks({ status: 'pending' }),
    countTasks({ status: 'in-progress' }),
    countTasks({ status: 'hold' }),
    countTasks({ status: 'cancelled' }),
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

  const dashboardLatestTasks = [
    ...latestSheetTasks.map((task) => ({
      _id: task._id,
      title: getSheetTaskTitle(task),
      status: task.status,
      assignedTo: task.assignedTo || { name: 'Unassigned' },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      source: 'google-sheet',
    })),
    ...latestTasks.map((task) => ({
      _id: task._id,
      title: task.title,
      status: task.status,
      assignedTo: task.assignedTo || { name: 'Unassigned' },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt || task.createdAt,
      source: 'manual',
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const totalTasks = sheetTaskCount + manualTaskCount;

  res.json({
    success: true,
    data: {
      includesSheetTasks: sheetTaskCount > 0,
      cards: {
        totalEmployees,
        departments: totalDepartments,
        teams: totalTeams,
        totalTasks,
        sheetTasks: sheetTaskCount,
        manualTasks: manualTaskCount,
        completed: sheetCompletedCount + completedCount,
        pending: sheetPendingCount + pendingCount,
        inProgress: sheetInProgressCount + inProgressCount,
        hold: (sheetHoldCount || 0) + (holdCount || 0),
        cancelled: (sheetCancelledCount || 0) + (cancelledCount || 0),
        late: lateCount,
        weekly: sheetWeeklyCount + weeklyCount,
        monthly: sheetMonthlyCount + monthlyCount,
      },
      recentActivity: { latestTasks: dashboardLatestTasks, latestLogins, latestReports },
    },
  });
});

// GET /dashboard/employee
const employeeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = { $gte: startOfDay(), $lte: endOfDay() };
  const manualFilter = { assignedTo: userId, isArchived: { $ne: true } };
  const sheetFilter = { assignedTo: userId };

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
    allManualTasks,
    allSheetTasks,
  ] = await Promise.all([
    countTasks(manualFilter),
    countTasks({ ...manualFilter, taskDate: today }),
    countTasks({ ...manualFilter, status: 'completed' }),
    countTasks({ ...manualFilter, status: 'pending' }),
    countTasks({ ...manualFilter, status: 'in-progress' }),
    countTasks({
      ...manualFilter,
      status: { $in: ['pending', 'in-progress'] },
      expectedCompletion: { $lt: new Date() },
    }),
    countTasks({ ...manualFilter, taskDate: { $gte: startOfWeek() } }),
    countTasks({ ...manualFilter, taskDate: { $gte: startOfMonth() } }),
    Task.find(manualFilter)
      .populate('project', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title project priority status createdAt updatedAt'),
    GoogleSheetTask.find(sheetFilter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('data status progress assignedAt updatedAt rowNumber'),
    Task.find({
      ...manualFilter,
      status: { $in: ['pending', 'in-progress'] },
      expectedCompletion: { $gte: new Date() },
    })
      .sort({ expectedCompletion: 1 })
      .limit(5)
      .select('title expectedCompletion priority'),
    countSheetTasks(sheetFilter),
    countSheetTasks({ ...sheetFilter, status: 'completed' }),
    countSheetTasks({ ...sheetFilter, status: { $in: pendingSheetStatuses } }),
    countSheetTasks({ ...sheetFilter, status: 'in-progress' }),
    countSheetTasks({ ...sheetFilter, assignedAt: today }),
    countSheetTasks({ ...sheetFilter, assignedAt: { $gte: startOfWeek() } }),
    countSheetTasks({ ...sheetFilter, assignedAt: { $gte: startOfMonth() } }),
    GoogleSheetTask.aggregate([
      { $match: sheetFilter },
      { $group: { _id: null, averageProgress: { $avg: '$progress' } } },
    ]),
    Task.find(manualFilter).select('status'),
    GoogleSheetTask.find(sheetFilter).select('progress'),
  ]);

  const combinedRecentTasks = [
    ...recentTasks.map((task) => ({
      ...task.toObject(),
      source: 'manual',
      project: task.project || { name: 'My Task' },
    })),
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

  const manualProgressTotal = allManualTasks.reduce(
    (sum, task) => sum + manualProgressFromStatus(task.status),
    0
  );
  const sheetProgressTotal = allSheetTasks.reduce((sum, task) => sum + (Number(task.progress) || 0), 0);
  const averageProgress = totalTrackedTasks
    ? Math.round((manualProgressTotal + sheetProgressTotal) / totalTrackedTasks)
    : 0;

  res.json({
    success: true,
    data: {
      includesSheetTasks: sheetTotalCount > 0,
      cards: {
        todayTasks: todayCount + sheetTodayCount,
        completed: completedCount + sheetCompletedCount,
        pending: pendingCount + sheetPendingCount,
        inProgress: inProgressCount + sheetInProgressCount,
        overdue: overdueCount,
        weeklySummary: weeklyCount + sheetWeeklyCount,
        monthlySummary: monthlyCount + sheetMonthlyCount,
        totalAssigned: totalTrackedTasks,
        sheetAssigned: sheetTotalCount,
        myTasks: totalCount,
        averageProgress,
      },
      recentTasks: combinedRecentTasks,
      upcomingDeadlines,
    },
  });
});

module.exports = { adminDashboard, employeeDashboard };
