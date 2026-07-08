const Task = require('../models/Task');
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

const REPORT_ACTION_LABELS = {
  'export-report-pdf': 'PDF Report',
  'export-report-excel': 'Excel Report',
  'export-report-csv': 'CSV Report',
};

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
    todayCount,
    completedCount,
    pendingCount,
    inProgressCount,
    overdueCount,
    weeklyCount,
    monthlyCount,
    recentTasks,
    upcomingDeadlines,
  ] = await Promise.all([
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
      .select('title project priority status createdAt'),
    Task.find({
      assignedTo: userId,
      status: { $in: ['pending', 'in-progress'] },
      expectedCompletion: { $gte: new Date() },
    })
      .sort({ expectedCompletion: 1 })
      .limit(5)
      .select('title expectedCompletion priority'),
  ]);

  res.json({
    success: true,
    data: {
      cards: {
        todayTasks: todayCount,
        completed: completedCount,
        pending: pendingCount,
        inProgress: inProgressCount,
        overdue: overdueCount,
        weeklySummary: weeklyCount,
        monthlySummary: monthlyCount,
      },
      recentTasks,
      upcomingDeadlines,
    },
  });
});

module.exports = { adminDashboard, employeeDashboard };
