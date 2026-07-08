const Holiday = require('../models/Holiday');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');
const { getPagination, buildMeta } = require('../utils/pagination');

// GET /holidays
const listHolidays = asyncHandler(async (req, res) => {
  const { pageNum, limitNum, skip } = getPagination(req.query);

  const [holidays, total] = await Promise.all([
    Holiday.find().sort({ date: 1 }).skip(skip).limit(limitNum),
    Holiday.countDocuments(),
  ]);

  res.json({ success: true, data: holidays, meta: buildMeta(pageNum, limitNum, total) });
});

// POST /holidays
const createHoliday = asyncHandler(async (req, res) => {
  const { name, date, description, isRecurringYearly } = req.body;

  const holiday = await Holiday.create({ name, date, description, isRecurringYearly });
  await logActivity(req.user._id, 'create-holiday', { name, date }, req.ip);

  res.status(201).json({ success: true, data: holiday });
});

// DELETE /holidays/:id
const deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findById(req.params.id);
  if (!holiday) {
    throw new ApiError(404, 'Holiday not found');
  }

  await holiday.deleteOne();
  await logActivity(req.user._id, 'delete-holiday', { id: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'Holiday deleted successfully' } });
});

// GET /calendar?month=&year=
const getCalendar = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const taskFilter = {
    expectedCompletion: { $gte: start, $lte: end },
  };
  if (req.user.role === 'employee') {
    taskFilter.assignedTo = req.user._id;
  }

  const [holidays, tasks] = await Promise.all([
    Holiday.find({ date: { $gte: start, $lte: end } }),
    Task.find(taskFilter).select('title expectedCompletion status assignedTo').populate('assignedTo', 'name'),
  ]);

  const events = [
    ...holidays.map((h) => ({
      type: 'holiday',
      id: h._id,
      title: h.name,
      date: h.date,
    })),
    ...tasks.map((t) => ({
      type: 'task-deadline',
      id: t._id,
      title: t.title,
      date: t.expectedCompletion,
      status: t.status,
      assignedTo: t.assignedTo,
    })),
  ];

  res.json({ success: true, data: { month, year, events } });
});

module.exports = { listHolidays, createHoliday, deleteHoliday, getCalendar };
