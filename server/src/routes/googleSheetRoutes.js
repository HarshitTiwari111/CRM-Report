const express = require('express');
const GoogleSheetConfig = require('../models/GoogleSheetConfig');
const GoogleSheetTask = require('../models/GoogleSheetTask');
const User = require('../models/User');
const { syncSingleSheet, upsertSheetTasks } = require('../utils/googleSyncService');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const router = express.Router();

const TRACKING_STATUSES = ['pending', 'assigned', 'in-progress', 'completed', 'hold', 'cancelled'];

const normalizeProgress = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const progress = Number(value);
  if (!Number.isFinite(progress)) {
    throw new ApiError(400, 'Progress must be a number between 0 and 100');
  }
  return Math.min(100, Math.max(0, Math.round(progress)));
};

const canEmployeeManageSheetTask = (task, userId) =>
  !task.assignedTo || task.assignedTo.equals(userId);

// POST /api/google-sheets/webhook-sync - Google Apps Script webhook to sync private sheets
router.post(
  '/webhook-sync',
  asyncHandler(async (req, res) => {
    const { url, rows } = req.body;
    if (!url || !rows || rows.length === 0) {
      throw new ApiError(400, 'Invalid payload: url and rows are required');
    }

    const { extractSheetInfo } = require('../utils/googleSyncService');
    const incomingInfo = extractSheetInfo(url);
    if (!incomingInfo) {
      throw new ApiError(400, 'Invalid Google Sheet URL format');
    }

    const configs = await GoogleSheetConfig.find();
    let matchedConfig = null;
    for (const cfg of configs) {
      const info = extractSheetInfo(cfg.url);
      if (info && info.sheetId === incomingInfo.sheetId) {
        matchedConfig = cfg;
        break;
      }
    }

    if (!matchedConfig) {
      throw new ApiError(404, 'No matching Google Sheet configuration found in CRM');
    }

    const headers = rows[0].map((h) => String(h).replace(/^\uFEFF/, '').trim());
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx] ?? '';
      });
      data.push(obj);
    }

    await upsertSheetTasks(matchedConfig._id, data);

    matchedConfig.headers = headers;
    matchedConfig.lastSyncedAt = new Date();
    matchedConfig.syncError = '';
    await matchedConfig.save();

    res.json({ success: true, data: { count: data.length } });
  })
);

// Apply auth middleware to all other routes
router.use(protect);

// GET /api/google-sheets - Get all sheet configs (usually just one)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const configs = await GoogleSheetConfig.find().sort({ createdAt: -1 });
    res.json({ success: true, data: configs });
  })
);

// POST /api/google-sheets - Add or update a sheet config
router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      throw new ApiError(403, 'Access denied. Superadmins only.');
    }

    const { url, name, syncMode } = req.body;
    if (!url) {
      throw new ApiError(400, 'Google Sheet URL is required');
    }

    // Find existing or create
    let config = await GoogleSheetConfig.findOne();
    if (config) {
      config.url = url;
      if (name) config.name = name;
      if (syncMode) config.syncMode = syncMode;
      // Clear previous sync error when URL/mode changes
      config.syncError = '';
    } else {
      config = new GoogleSheetConfig({
        url,
        name: name || 'Tasks Sheet',
        syncMode: syncMode || 'pull',
      });
    }

    await config.save();

    // Try initial sync immediately (only for public pull-mode sheets)
    if (config.syncMode === 'pull') {
      try {
        await syncSingleSheet(config);
      } catch (err) {
        config.syncError = err.message;
        await config.save();
      }
    }

    res.status(201).json({ success: true, data: config });
  })
);

// POST /api/google-sheets/:id/sync - Force sync now
router.post(
  '/:id/sync',
  asyncHandler(async (req, res) => {
    const config = await GoogleSheetConfig.findById(req.params.id);
    if (!config) {
      throw new ApiError(404, 'Configuration not found');
    }

    try {
      const result = await syncSingleSheet(config);
      res.json({ success: true, data: { message: 'Synced successfully', count: result.count } });
    } catch (err) {
      config.syncError = err.message;
      await config.save();
      throw new ApiError(400, `Sync failed: ${err.message}`);
    }
  })
);

// GET /api/google-sheets/:id/tasks - Get dynamic tasks
router.get(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const config = await GoogleSheetConfig.findById(req.params.id);
    if (!config) {
      throw new ApiError(404, 'Configuration not found');
    }

    const { page = 1, limit = 20, search, employee, status, view, assigned } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const filter = { config: config._id };

    if (req.user.role === 'employee') {
      if (view === 'available') {
        filter.assignedTo = null;
      } else if (view === 'mine') {
        filter.assignedTo = req.user._id;
      } else {
        filter.$or = [{ assignedTo: null }, { assignedTo: req.user._id }];
      }
    } else if (employee) {
      filter.assignedTo = employee;
    } else if (assigned === 'only') {
      filter.assignedTo = { $ne: null };
    }

    if (status) {
      filter.status = status;
    }

    if (search && config.headers && config.headers.length > 0) {
      const regex = new RegExp(search, 'i');
      const searchOr = config.headers.map((header) => ({
        [`data.${header}`]: { $regex: regex },
      }));

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const [tasks, total] = await Promise.all([
      GoogleSheetTask.find(filter)
        .populate('assignedTo', 'name email employeeId')
        .populate('assignedBy', 'name email employeeId role')
        .sort({ rowNumber: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      GoogleSheetTask.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// PATCH /api/google-sheets/tasks/:taskId/self-assign - Employee claims an available task
router.patch(
  '/tasks/:taskId/self-assign',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'employee') {
      throw new ApiError(403, 'Only employees can self-assign tasks');
    }

    const task = await GoogleSheetTask.findOneAndUpdate(
      {
        _id: req.params.taskId,
        assignedTo: null,
      },
      {
        $set: {
          assignedTo: req.user._id,
          assignedAt: new Date(),
          assignedBy: req.user._id,
          assignmentSource: 'employee',
          status: 'assigned',
          progress: 0,
        },
      },
      { new: true }
    )
      .populate('assignedTo', 'name email employeeId')
      .populate('assignedBy', 'name email employeeId role');

    if (!task) {
      throw new ApiError(409, 'This task has already been assigned to someone else');
    }

    res.json({ success: true, data: task });
  })
);

// PATCH /api/google-sheets/tasks/:taskId/assign - Admin assigns or reassigns a task
router.patch(
  '/tasks/:taskId/assign',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      throw new ApiError(403, 'Access denied. Superadmins only.');
    }

    const { employeeId } = req.body;
    if (!employeeId) {
      throw new ApiError(400, 'Employee is required');
    }

    const employee = await User.findOne({ _id: employeeId, role: 'employee', isActive: true });
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    const task = await GoogleSheetTask.findByIdAndUpdate(
      req.params.taskId,
      {
        $set: {
          assignedTo: employee._id,
          assignedAt: new Date(),
          assignedBy: req.user._id,
          assignmentSource: 'admin',
          status: 'assigned',
          progress: 0,
        },
      },
      { new: true }
    )
      .populate('assignedTo', 'name email employeeId')
      .populate('assignedBy', 'name email employeeId role');

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    res.json({ success: true, data: task });
  })
);

// PATCH /api/google-sheets/tasks/:taskId/release - Employee releases a self-assigned task; admin can unassign any sheet task
router.patch(
  '/tasks/:taskId/release',
  asyncHandler(async (req, res) => {
    const task = await GoogleSheetTask.findById(req.params.taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (req.user.role === 'employee') {
      if (!task.assignedTo || !task.assignedTo.equals(req.user._id)) {
        throw new ApiError(403, 'You can only release tasks assigned to you');
      }
      if (task.assignmentSource !== 'employee') {
        throw new ApiError(403, 'Admin-assigned tasks can only be changed by an admin');
      }
    } else if (req.user.role !== 'superadmin') {
      throw new ApiError(403, 'Access denied');
    }

    task.assignedTo = null;
    task.assignedAt = null;
    task.assignedBy = null;
    task.assignmentSource = null;
    task.status = 'pending';
    task.progress = 0;

    await task.save();

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email employeeId' },
      { path: 'assignedBy', select: 'name email employeeId role' },
    ]);

    res.json({ success: true, data: populated });
  })
);

// PATCH /api/google-sheets/tasks/:taskId/content - Edit a synced sheet task inside CRM
router.patch(
  '/tasks/:taskId/content',
  asyncHandler(async (req, res) => {
    const task = await GoogleSheetTask.findById(req.params.taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (req.user.role === 'employee' && !canEmployeeManageSheetTask(task, req.user._id)) {
      throw new ApiError(403, 'You can only edit available tasks or tasks assigned to you');
    }

    if (req.body.data && typeof req.body.data === 'object') {
      task.data = req.body.data;
    }
    if (req.body.status && TRACKING_STATUSES.includes(req.body.status)) {
      task.status = req.body.status;
    }
    const progress = normalizeProgress(req.body.progress);
    if (progress !== undefined) {
      task.progress = progress;
    }

    await task.save();

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email employeeId' },
      { path: 'assignedBy', select: 'name email employeeId role' },
    ]);

    res.json({ success: true, data: populated });
  })
);

// DELETE /api/google-sheets/tasks/:taskId - Remove a synced sheet task from CRM
router.delete(
  '/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const task = await GoogleSheetTask.findById(req.params.taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (req.user.role === 'employee' && !canEmployeeManageSheetTask(task, req.user._id)) {
      throw new ApiError(403, 'You can only delete available tasks or tasks assigned to you');
    }

    await task.deleteOne();

    res.json({ success: true, data: { message: 'Task deleted successfully' } });
  })
);

// PATCH /api/google-sheets/tasks/:taskId/progress - Update assigned task tracking
router.patch(
  '/tasks/:taskId/progress',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const progress = normalizeProgress(req.body.progress);

    if (status && !TRACKING_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid task status');
    }

    if (!status && progress === undefined) {
      throw new ApiError(400, 'Status or progress is required');
    }

    const task = await GoogleSheetTask.findById(req.params.taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (!task.assignedTo) {
      throw new ApiError(400, 'Task must be assigned before progress can be updated');
    }

    if (req.user.role === 'employee' && !task.assignedTo.equals(req.user._id)) {
      throw new ApiError(403, 'You can only update your own assigned tasks');
    }

    if (status) task.status = status;
    if (progress !== undefined) task.progress = progress;

    if (task.status === 'completed' && task.progress < 100) {
      task.progress = 100;
    }

    await task.save();

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email employeeId' },
      { path: 'assignedBy', select: 'name email employeeId role' },
    ]);

    res.json({ success: true, data: populated });
  })
);

// DELETE /api/google-sheets/:id - Delete configuration & task entries
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      throw new ApiError(403, 'Access denied. Superadmins only.');
    }

    const config = await GoogleSheetConfig.findById(req.params.id);
    if (!config) {
      throw new ApiError(404, 'Configuration not found');
    }

    await GoogleSheetTask.deleteMany({ config: config._id });
    await config.deleteOne();

    res.json({ success: true, data: { message: 'Google Sheet configuration deleted successfully' } });
  })
);

module.exports = router;
