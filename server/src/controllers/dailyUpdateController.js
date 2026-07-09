const DailyUpdate = require('../models/DailyUpdate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const normalizeWorkDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item || '').trim()).filter(Boolean);
};

// GET /daily-updates
const listDailyUpdates = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, employeeId, dateFrom, dateTo, search } = req.query;

  const filter = {};
  if (req.user.role === 'employee') {
    filter.employee = req.user._id;
  } else if (employeeId) {
    filter.employee = employeeId;
  }

  if (dateFrom || dateTo) {
    filter.workDate = {};
    if (dateFrom) filter.workDate.$gte = normalizeWorkDate(dateFrom);
    if (dateTo) {
      const to = normalizeWorkDate(dateTo);
      if (to) {
        to.setHours(23, 59, 59, 999);
        filter.workDate.$lte = to;
      }
    }
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ items: regex }, { notes: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const [updates, total] = await Promise.all([
    DailyUpdate.find(filter)
      .populate('employee', 'name email employeeId')
      .sort({ workDate: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    DailyUpdate.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: updates,
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

// POST /daily-updates
const createDailyUpdate = asyncHandler(async (req, res) => {
  if (req.user.role !== 'employee' && req.user.role !== 'superadmin') {
    throw new ApiError(403, 'You do not have permission to create daily updates');
  }

  const workDate = normalizeWorkDate(req.body.workDate);
  const items = parseItems(req.body.items);
  const notes = String(req.body.notes || '').trim();

  if (!workDate) {
    throw new ApiError(400, 'Please provide a valid work date');
  }

  if (!items.length) {
    throw new ApiError(400, 'Please add at least one work item');
  }

  const employeeId = req.user.role === 'employee' ? req.user._id : req.body.employeeId || req.user._id;

  const update = await DailyUpdate.create({
    employee: employeeId,
    workDate,
    items,
    notes,
  });

  const populated = await update.populate('employee', 'name email employeeId');

  await logActivity(req.user._id, 'create-daily-update', { dailyUpdateId: update._id.toString() }, req.ip);

  res.status(201).json({ success: true, data: populated });
});

module.exports = {
  listDailyUpdates,
  createDailyUpdate,
};
