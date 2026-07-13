const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const GoogleSheetTask = require('../models/GoogleSheetTask');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
};

// GET /users
const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, department, team, status, role } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }
  if (department) filter.department = department;
  if (team) filter.team = team;
  if (role) filter.role = role;
  if (status !== undefined && status !== '') filter.isActive = status === 'active' || status === 'true';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('manager', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users.map(sanitizeUser),
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

// POST /users
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, department, designation, manager, joiningDate, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone,
    department: department || undefined,
    designation,
    manager: manager || undefined,
    joiningDate,
    role: role || 'employee',
  });

  await logActivity(req.user._id, 'create-user', { targetUser: user._id.toString(), email: user.email }, req.ip);

  res.status(201).json({ success: true, data: sanitizeUser(user) });
});

// GET /users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('department', 'name')
    .populate('team', 'name')
    .populate('manager', 'name email');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({ success: true, data: sanitizeUser(user) });
});

// PUT /users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, department, designation, manager, joiningDate, role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (email && email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'A user with this email already exists');
    }
    user.email = email.toLowerCase();
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (department !== undefined) user.department = department || undefined;
  if (designation !== undefined) user.designation = designation;
  if (manager !== undefined) user.manager = manager || undefined;
  if (joiningDate !== undefined) user.joiningDate = joiningDate;
  if (role !== undefined) user.role = role;

  await user.save();

  await logActivity(req.user._id, 'update-user', { targetUser: user._id.toString() }, req.ip);

  res.json({ success: true, data: sanitizeUser(user) });
});

// DELETE /users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  await user.deleteOne();

  await logActivity(req.user._id, 'delete-user', { targetUser: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'User deleted successfully' } });
});

// PATCH /users/:id/status
const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.isActive = isActive;
  await user.save();

  await logActivity(req.user._id, 'set-user-status', { targetUser: user._id.toString(), isActive }, req.ip);

  res.json({ success: true, data: sanitizeUser(user) });
});

// PATCH /users/:id/reset-password
const adminResetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  await logActivity(req.user._id, 'admin-reset-password', { targetUser: user._id.toString() }, req.ip);

  res.json({ success: true, data: { message: 'Password reset successfully' } });
});

// PATCH /users/:id/assign
const assignUser = asyncHandler(async (req, res) => {
  const { department, team, manager } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (department !== undefined) user.department = department || undefined;
  if (team !== undefined) user.team = team || undefined;
  if (manager !== undefined) user.manager = manager || undefined;

  await user.save();

  await logActivity(req.user._id, 'assign-user', { targetUser: user._id.toString(), department, team, manager }, req.ip);

  res.json({ success: true, data: sanitizeUser(user) });
});

// GET /users/:id/performance
const getUserPerformance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'employee' && req.user._id.toString() !== id) {
    throw new ApiError(403, 'You can only view your own performance summary');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const [statusAgg, hoursAgg, sheetStatusAgg] = await Promise.all([
    Task.aggregate([
      { $match: { assignedTo: user._id, isArchived: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { assignedTo: user._id, isArchived: { $ne: true } } },
      { $group: { _id: null, avgHours: { $avg: '$totalHours' }, totalHours: { $sum: '$totalHours' } } },
    ]),
    GoogleSheetTask.aggregate([
      { $match: { assignedTo: user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = {};
  for (const s of statusAgg) statusCounts[s._id] = (statusCounts[s._id] || 0) + s.count;
  for (const s of sheetStatusAgg) statusCounts[s._id] = (statusCounts[s._id] || 0) + s.count;
  const totalTasks = Object.values(statusCounts).reduce((sum, c) => sum + c, 0);

  res.json({
    success: true,
    data: {
      userId: user._id,
      name: user.name,
      totalTasks,
      completed: statusCounts.completed || 0,
      pending: (statusCounts.pending || 0) + (statusCounts.assigned || 0),
      inProgress: statusCounts['in-progress'] || 0,
      hold: statusCounts.hold || 0,
      cancelled: statusCounts.cancelled || 0,
      avgHours: hoursAgg[0]?.avgHours ? Math.round(hoursAgg[0].avgHours * 100) / 100 : 0,
      totalHours: hoursAgg[0]?.totalHours ? Math.round(hoursAgg[0].totalHours * 100) / 100 : 0,
    },
  });
});

// PUT /users/me/profile
const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (req.file) {
    user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
  } else if (req.body.profilePhoto !== undefined) {
    user.profilePhoto = req.body.profilePhoto;
  }

  await user.save();

  await logActivity(req.user._id, 'update-profile', {}, req.ip);

  res.json({ success: true, data: sanitizeUser(user) });
});

module.exports = {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  setUserStatus,
  adminResetPassword,
  assignUser,
  getUserPerformance,
  updateMyProfile,
};
