const Task = require('../models/Task');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { generateTaskReportPDF } = require('../utils/pdfGenerator');
const { generateTaskExcel, generateTaskCSV } = require('../utils/excelGenerator');
const { logActivity } = require('../utils/activityLogger');

const buildFilter = (req) => {
  const { employeeId, department, project, status, dateFrom, dateTo } = req.query;

  const filter = {};

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

const fetchTasks = (filter) =>
  Task.find(filter)
    .populate('project', 'name')
    .populate('client', 'name')
    .populate('department', 'name')
    .populate('assignedTo', 'name email employeeId')
    .sort({ taskDate: -1 });

// GET /reports/pdf
const exportPDF = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const tasks = await fetchTasks(filter);
  const settings = await Settings.findOne();

  await logActivity(req.user._id, 'export-report-pdf', { filter, type: req.query.type }, req.ip);

  generateTaskReportPDF(res, tasks, {
    companyName: settings?.companyName,
    type: req.query.type || 'employee',
  });
});

// GET /reports/excel
const exportExcel = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const tasks = await fetchTasks(filter);

  await logActivity(req.user._id, 'export-report-excel', { filter, type: req.query.type }, req.ip);

  await generateTaskExcel(res, tasks);
});

// GET /reports/csv
const exportCSV = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const tasks = await fetchTasks(filter);

  await logActivity(req.user._id, 'export-report-csv', { filter, type: req.query.type }, req.ip);

  await generateTaskCSV(res, tasks);
});

module.exports = { exportPDF, exportExcel, exportCSV };
