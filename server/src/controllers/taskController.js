const Task = require('../models/Task');
const User = require('../models/User');
const Department = require('../models/Department');
const { parseCsvFile } = require('../utils/csvParser');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');
const { notifyManagersAndAdmins } = require('../utils/notify');
const { isAdminLevel } = require('../utils/roles');

const POPULATE_FIELDS = [
  { path: 'project', select: 'name' },
  { path: 'client', select: 'name' },
  { path: 'department', select: 'name' },
  { path: 'assignedTo', select: 'name email employeeId manager' },
  { path: 'createdBy', select: 'name email employeeId' },
];

const buildAttachments = (files = []) =>
  files.map((file) => ({
    url: `/uploads/attachments/${file.filename}`,
    type: file.mimetype,
    name: file.originalname,
  }));

const isOwnedByUser = (task, userId) =>
  Boolean(task.assignedTo?._id?.equals(userId) || task.assignedTo?.equals?.(userId) || task.createdBy?.equals?.(userId));

const computeTotalHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
};

// GET /tasks
const listTasks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    priority,
    project,
    department,
    employee,
    dateFrom,
    dateTo,
    sortBy = 'taskDate',
    sortOrder = 'desc',
    scope,
  } = req.query;

  const filter = { isArchived: { $ne: true } };

  if (!isAdminLevel(req.user.role)) {
    if (scope === 'pool') {
      filter.$or = [{ assignedTo: null }, { assignedTo: req.user._id }];
    } else if (scope === 'available') {
      filter.assignedTo = null;
    } else {
      filter.assignedTo = req.user._id;
    }
  } else if (employee) {
    filter.assignedTo = employee;
  }

  if (search) {
    const searchOr = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { remarks: { $regex: search, $options: 'i' } },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (project) filter.project = project;
  if (department) filter.department = department;

  if (dateFrom || dateTo) {
    filter.taskDate = {};
    if (dateFrom) filter.taskDate.$gte = new Date(dateFrom);
    if (dateTo) filter.taskDate.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: tasks,
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

// GET /tasks/copy-previous
const copyPrevious = asyncHandler(async (req, res) => {
  const mostRecentTask = await Task.findOne({ assignedTo: req.user._id })
    .sort({ taskDate: -1 })
    .select('taskDate');

  if (!mostRecentTask || !mostRecentTask.taskDate) {
    return res.json({ success: true, data: [] });
  }

  const targetDate = new Date(mostRecentTask.taskDate);
  const startOfTargetDay = new Date(targetDate);
  startOfTargetDay.setHours(0, 0, 0, 0);
  const endOfTargetDay = new Date(targetDate);
  endOfTargetDay.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    assignedTo: req.user._id,
    taskDate: { $gte: startOfTargetDay, $lte: endOfTargetDay },
  }).populate(POPULATE_FIELDS);

  res.json({ success: true, data: tasks });
});

// GET /tasks/:id
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate(POPULATE_FIELDS);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (!isAdminLevel(req.user.role) && !isOwnedByUser(task, req.user._id)) {
    throw new ApiError(403, 'You do not have permission to view this task');
  }

  res.json({ success: true, data: task });
});

// POST /tasks
const createTask = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  const assignedTo = !isAdminLevel(req.user.role) ? body.assignedTo || null : body.assignedTo || req.user._id;
  const status = assignedTo ? body.status || 'pending' : 'pending';

  if (!body.totalHours) {
    body.totalHours = computeTotalHours(body.startTime, body.endTime);
  }

  const task = await Task.create({
    ...body,
    assignedTo,
    status,
    createdBy: req.user._id,
    attachments: buildAttachments(req.files),
  });

  const populated = await task.populate(POPULATE_FIELDS);

  await logActivity(req.user._id, 'create-task', { taskId: task._id.toString(), title: task.title }, req.ip);

  if (populated.assignedTo) {
    await notifyManagersAndAdmins({
      employee: populated.assignedTo,
      title: 'New task created',
      message: `${populated.assignedTo.name} created a task: "${task.title}"`,
      type: 'task',
      link: `/tasks/${task._id}`,
      relatedId: task._id,
    });
  }

  res.status(201).json({ success: true, data: populated });
});

// PUT /tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo', 'name manager');

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (!isAdminLevel(req.user.role) && !isOwnedByUser(task, req.user._id)) {
    throw new ApiError(403, 'You do not have permission to update this task');
  }

  const editableFields = [
    'title',
    'description',
    'project',
    'client',
    'department',
    'priority',
    'taskType',
    'startTime',
    'endTime',
    'totalHours',
    'taskDate',
    'expectedCompletion',
    'actualCompletion',
    'status',
    'remarks',
    'githubLink',
    'taskUrl',
    'notes',
    'isArchived',
  ];

  if (isAdminLevel(req.user.role) && req.body.assignedTo) {
    task.assignedTo = req.body.assignedTo;
  }

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  if ((req.body.startTime !== undefined || req.body.endTime !== undefined) && !req.body.totalHours) {
    task.totalHours = computeTotalHours(task.startTime, task.endTime);
  }

  if (req.files && req.files.length) {
    task.attachments = [...task.attachments, ...buildAttachments(req.files)];
  }

  await task.save();
  const populated = await task.populate(POPULATE_FIELDS);

  await logActivity(req.user._id, 'update-task', { taskId: task._id.toString() }, req.ip);

  if (populated.assignedTo) {
    await notifyManagersAndAdmins({
      employee: populated.assignedTo,
      title: 'Task updated',
      message: `${populated.assignedTo.name} updated task: "${task.title}"`,
      type: 'task',
      link: `/tasks/${task._id}`,
      relatedId: task._id,
    });
  }

  res.json({ success: true, data: populated });
});

// PATCH /tasks/:id/self-assign
const selfAssignTask = asyncHandler(async (req, res) => {
  if (isAdminLevel(req.user.role)) {
    throw new ApiError(403, 'Admins assign tasks directly; self-assign is for employees and managers');
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, assignedTo: null },
    { $set: { assignedTo: req.user._id, status: 'pending' } },
    { new: true }
  ).populate(POPULATE_FIELDS);

  if (!task) {
    throw new ApiError(409, 'This task has already been assigned to someone else');
  }

  await logActivity(req.user._id, 'self-assign-task', { taskId: task._id.toString() }, req.ip);

  res.json({ success: true, data: task });
});

// DELETE /tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo', 'name manager');

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (!isAdminLevel(req.user.role) && !isOwnedByUser(task, req.user._id)) {
    throw new ApiError(403, 'You do not have permission to delete this task');
  }

  await task.deleteOne();

  await logActivity(req.user._id, 'delete-task', { taskId: req.params.id, title: task.title }, req.ip);

  if (task.assignedTo) {
    await notifyManagersAndAdmins({
      employee: task.assignedTo,
      title: 'Task deleted',
      message: `${task.assignedTo.name} deleted task: "${task.title}"`,
      type: 'task',
      relatedId: task._id,
    });
  }

  res.json({ success: true, data: { message: 'Task deleted successfully' } });
});

// PATCH /tasks/:id/status
const patchStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo', 'name manager');

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (!isAdminLevel(req.user.role) && !isOwnedByUser(task, req.user._id)) {
    throw new ApiError(403, 'You do not have permission to update this task');
  }

  task.status = req.body.status;
  if (req.body.status === 'completed' && !task.actualCompletion) {
    task.actualCompletion = new Date();
  }

  await task.save();
  const populated = await task.populate(POPULATE_FIELDS);

  await logActivity(req.user._id, 'update-task-status', { taskId: task._id.toString(), status: task.status }, req.ip);

  if (populated.assignedTo) {
    await notifyManagersAndAdmins({
      employee: populated.assignedTo,
      title: 'Task status changed',
      message: `${populated.assignedTo.name} marked "${task.title}" as ${task.status}`,
      type: 'task',
      link: `/tasks/${task._id}`,
      relatedId: task._id,
    });
  }

  res.json({ success: true, data: populated });
});

// POST /tasks/:id/duplicate
const duplicateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (!isAdminLevel(req.user.role) && (!task.assignedTo || !task.assignedTo.equals(req.user._id))) {
    throw new ApiError(403, 'You do not have permission to duplicate this task');
  }

  const clone = task.toObject();
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  clone.status = 'pending';
  clone.actualCompletion = undefined;
  clone.taskDate = new Date();
  clone.createdBy = req.user._id;

  const newTask = await Task.create(clone);
  const populated = await newTask.populate(POPULATE_FIELDS);

  await logActivity(req.user._id, 'duplicate-task', { originalId: task._id.toString(), newId: newTask._id.toString() }, req.ip);

  res.status(201).json({ success: true, data: populated });
});

// POST /tasks/bulk-update
const bulkUpdate = asyncHandler(async (req, res) => {
  const { ids, update } = req.body;

  const filter = { _id: { $in: ids } };
  if (!isAdminLevel(req.user.role)) {
    filter.assignedTo = req.user._id;
  }

  const allowedFields = ['status', 'priority', 'taskType', 'department', 'project', 'isArchived'];
  const safeUpdate = {};
  allowedFields.forEach((field) => {
    if (update[field] !== undefined) safeUpdate[field] = update[field];
  });

  const result = await Task.updateMany(filter, { $set: safeUpdate });

  await logActivity(req.user._id, 'bulk-update-tasks', { ids, update: safeUpdate }, req.ip);

  res.json({ success: true, data: { matched: result.matchedCount, modified: result.modifiedCount } });
});

// POST /tasks/bulk-delete
const bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  const filter = { _id: { $in: ids } };
  if (!isAdminLevel(req.user.role)) {
    filter.assignedTo = req.user._id;
  }

  const result = await Task.deleteMany(filter);

  await logActivity(req.user._id, 'bulk-delete-tasks', { ids, deletedCount: result.deletedCount }, req.ip);

  res.json({ success: true, data: { deleted: result.deletedCount } });
});

// POST /tasks/import-csv
const importCsvTasks = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const filePath = req.file.path;
  let parsedRows;

  try {
    parsedRows = parseCsvFile(filePath);
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new ApiError(400, `Failed to parse CSV file: ${err.message}`);
  }

  let skippedCount = 0;
  let successCount = 0;

  function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1; // 0-indexed
      const year = parseInt(parts[3], 10);
      const hour = parseInt(parts[4] || '0', 10);
      const minute = parseInt(parts[5] || '0', 10);
      const second = parseInt(parts[6] || '0', 10);
      return new Date(year, month, day, hour, minute, second);
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  for (const row of parsedRows) {
    const timestamp = row['Timestamp'] || '';
    const yourName = row['Your Name'] || '';
    const deptName = row['Vertical / Department'] || '';
    const taskName = row['Task Name '] || row['Task Name'] || '';
    const processSteps = row['Step-by-Step Process '] || row['Step-by-Step Process'] || '';
    const whoDoes = row['Who Currently Does This? '] || row['Who Currently Does This?'] || '';
    const howOften = row['How Often? '] || row['How Often?'] || '';
    const timePerOccur = row['Time Per Occurrence '] || row['Time Per Occurrence'] || '';
    const toolsUsed = row['Tools / Platforms Used '] || row['Tools / Platforms Used'] || '';
    const painLevel = row['Pain Level '] || row['Pain Level'] || '';
    const addNotes = row['Additional Notes / Edge Cases '] || row['Additional Notes / Edge Cases'] || '';

    if (!taskName) {
      skippedCount++;
      continue;
    }

    let assignedToId = req.user._id;
    if (yourName) {
      const matchedUser = await User.findOne({ name: { $regex: new RegExp(`^${yourName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      if (matchedUser) {
        assignedToId = matchedUser._id;
      }
    }

    let departmentId = null;
    if (deptName) {
      let deptDoc = await Department.findOne({ name: { $regex: new RegExp(`^${deptName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      if (!deptDoc) {
        deptDoc = await Department.create({ name: deptName.trim() });
      }
      departmentId = deptDoc._id;
    }

    let priority = 'medium';
    const pain = painLevel.toLowerCase();
    if (pain.includes('low')) priority = 'low';
    else if (pain.includes('high')) priority = 'high';
    else if (pain.includes('urgent') || pain.includes('severe') || pain.includes('critical')) priority = 'urgent';

    const taskDate = parseDate(timestamp);

    const startOfDay = new Date(taskDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(taskDate);
    endOfDay.setHours(23, 59, 59, 999);

    const duplicate = await Task.findOne({
      title: taskName.trim(),
      assignedTo: assignedToId,
      taskDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (duplicate) {
      skippedCount++;
      continue;
    }

    const descriptionParts = [];
    if (processSteps) descriptionParts.push(`**Step-by-Step Process:**\n${processSteps}`);
    if (whoDoes) descriptionParts.push(`**Who Currently Does This?:** ${whoDoes}`);
    if (howOften) descriptionParts.push(`**How Often?:** ${howOften}`);
    if (timePerOccur) descriptionParts.push(`**Time Per Occurrence:** ${timePerOccur}`);
    if (toolsUsed) descriptionParts.push(`**Tools / Platforms Used:** ${toolsUsed}`);

    const description = descriptionParts.join('\n\n');
    const remarks = addNotes ? `Additional Notes: ${addNotes}` : '';

    await Task.create({
      title: taskName.trim(),
      description,
      department: departmentId,
      assignedTo: assignedToId,
      priority,
      taskDate,
      remarks,
      status: 'pending',
      createdBy: req.user._id,
    });

    successCount++;
  }

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await logActivity(req.user._id, 'import-tasks-csv', { count: successCount }, req.ip);

  res.json({
    success: true,
    data: {
      successCount,
      skippedCount,
      totalCount: parsedRows.length,
    },
  });
});

module.exports = {
  listTasks,
  copyPrevious,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  patchStatus,
  duplicateTask,
  bulkUpdate,
  bulkDelete,
  importCsvTasks,
  selfAssignTask,
};
