const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const isLateArrival = async (clockInTime) => {
  const settings = await Settings.findOne();
  if (!settings?.officeHours?.start) return false;

  const [hour, minute] = settings.officeHours.start.split(':').map(Number);
  const officeStart = new Date(clockInTime);
  officeStart.setHours(hour, minute, 0, 0);

  return clockInTime > officeStart;
};

// POST /attendance/clock-in
const clockIn = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();

  const existing = await Attendance.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
  if (existing && existing.clockIn) {
    throw new ApiError(400, 'You have already clocked in today');
  }

  const now = new Date();
  const late = await isLateArrival(now);

  let attendance;
  if (existing) {
    existing.clockIn = now;
    existing.isLate = late;
    attendance = await existing.save();
  } else {
    attendance = await Attendance.create({
      user: req.user._id,
      date: start,
      clockIn: now,
      isLate: late,
    });
  }

  await logActivity(req.user._id, 'clock-in', { time: now }, req.ip);

  res.status(201).json({ success: true, data: attendance });
});

// POST /attendance/clock-out
const clockOut = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();

  const attendance = await Attendance.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });

  if (!attendance || !attendance.clockIn) {
    throw new ApiError(400, 'You must clock in before clocking out');
  }
  if (attendance.clockOut) {
    throw new ApiError(400, 'You have already clocked out today');
  }

  const now = new Date();
  attendance.clockOut = now;
  attendance.totalHours = Math.round(((now - attendance.clockIn) / (1000 * 60 * 60)) * 100) / 100;
  await attendance.save();

  await logActivity(req.user._id, 'clock-out', { time: now }, req.ip);

  res.json({ success: true, data: attendance });
});

// GET /attendance/me?month=
const myAttendance = asyncHandler(async (req, res) => {
  const { month } = req.query;

  const filter = { user: req.user._id };
  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }

  const records = await Attendance.find(filter).sort({ date: -1 });

  res.json({ success: true, data: records });
});

// GET /attendance (superadmin, all employees, filters)
const allAttendance = asyncHandler(async (req, res) => {
  const { user, employee, date, dateFrom, dateTo, page = 1, limit = 30 } = req.query;

  const filter = {};
  const userId = user || employee;
  if (userId) filter.user = userId;

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  } else if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 30);

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('user', 'name email employeeId department')
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: records,
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

module.exports = { clockIn, clockOut, myAttendance, allAttendance };
