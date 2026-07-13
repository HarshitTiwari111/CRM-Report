const Task = require('../models/Task');
const GoogleSheetTask = require('../models/GoogleSheetTask');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { generateTaskReportPDF } = require('../utils/pdfGenerator');
const { generateTaskExcel, generateTaskCSV } = require('../utils/excelGenerator');
const { logActivity } = require('../utils/activityLogger');

const getSheetTaskTitle = (task) => {
  const entries = task.data instanceof Map ? Array.from(task.data.entries()) : Object.entries(task.data || {});
  const titleEntry =
    entries.find(([key]) => /task.?name|title|subject/i.test(key)) ||
    entries.find(([, value]) => String(value || '').trim());
  return String(titleEntry?.[1] || `Sheet row #${task.rowNumber}`).trim();
};

const parseSheetDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d)) return d;
  const m = String(raw).match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\s*(.*)?$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${m[4] || '00:00:00'}`);
  return null;
};

const buildFilter = (req) => {
  const { employeeId, department, project, status, dateFrom, dateTo } = req.query;

  const filter = { isArchived: { $ne: true } };

  if (req.user.role === 'employee') {
    filter.assignedTo = req.user._id;
  } else if (employeeId) {
    filter.assignedTo = employeeId;
  }

  if (department) filter.department = department;
  if (project) filter.project = project;
  if (status) filter.status = status;

  if (dateFrom || dateTo) {
    filter.taskDate = {};
    if (dateFrom) filter.taskDate.$gte = new Date(dateFrom);
    if (dateTo) filter.taskDate.$lte = new Date(dateTo);
  }

  return filter;
};

const fetchManualTasks = (filter) =>
  Task.find(filter)
    .populate('project', 'name')
    .populate('client', 'name')
    .populate('department', 'name')
    .populate('assignedTo', 'name email employeeId')
    .sort({ taskDate: -1 });

const fetchSheetTasks = async (req) => {
  const { employeeId, status, dateFrom, dateTo } = req.query;
  const filter = {};

  if (req.user.role === 'employee') {
    filter.assignedTo = req.user._id;
  } else if (employeeId) {
    filter.assignedTo = employeeId;
  }
  if (status) filter.status = status;

  let tasks = await GoogleSheetTask.find(filter)
    .populate('assignedTo', 'name email employeeId')
    .sort({ createdAt: -1 });

  if (dateFrom || dateTo) {
    tasks = tasks.filter((t) => {
      const data = t.data instanceof Map ? Object.fromEntries(t.data) : t.data || {};
      const dateRaw = data.Timestamp || t.createdAt;
      if (!dateRaw) return true;
      const d = parseSheetDate(dateRaw);
      if (!d) return true;
      const dateStr = d.toISOString().slice(0, 10);
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo && dateStr > dateTo) return false;
      return true;
    });
  }

  return tasks.map((t) => ({
    title: getSheetTaskTitle(t),
    project: { name: 'Google Sheet' },
    taskDate: (() => {
      const data = t.data instanceof Map ? Object.fromEntries(t.data) : t.data || {};
      const raw = data.Timestamp || t.createdAt;
      return parseSheetDate(raw);
    })(),
    totalHours: 0,
    status: t.status || 'pending',
    assignedTo: t.assignedTo,
  }));
};

const fetchAllTasks = async (req) => {
  const filter = buildFilter(req);
  const [manual, sheet] = await Promise.all([
    fetchManualTasks(filter),
    fetchSheetTasks(req),
  ]);
  return [...manual, ...sheet];
};

// GET /reports/pdf
const exportPDF = asyncHandler(async (req, res) => {
  const tasks = await fetchAllTasks(req);
  const settings = await Settings.findOne();

  await logActivity(req.user._id, 'export-report-pdf', { type: req.query.type }, req.ip);

  generateTaskReportPDF(res, tasks, {
    companyName: settings?.companyName,
    type: req.query.type || 'employee',
  });
});

// GET /reports/excel
const exportExcel = asyncHandler(async (req, res) => {
  const tasks = await fetchAllTasks(req);

  await logActivity(req.user._id, 'export-report-excel', { type: req.query.type }, req.ip);

  await generateTaskExcel(res, tasks);
});

// GET /reports/csv
const exportCSV = asyncHandler(async (req, res) => {
  const tasks = await fetchAllTasks(req);

  await logActivity(req.user._id, 'export-report-csv', { type: req.query.type }, req.ip);

  await generateTaskCSV(res, tasks);
});

module.exports = { exportPDF, exportExcel, exportCSV };
