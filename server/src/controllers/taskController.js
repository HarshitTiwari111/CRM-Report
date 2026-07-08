const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');
const { notifyManagersAndAdmins } = require('../utils/notify');

const POPULATE_FIELDS = [
  { path: 'project', select: 'name' },
  { path: 'client', select: 'name' },
  { path: 'department', select: 'name' },
  { path: 'assignedTo', select: 'name email employeeId manager' },
];

const buildAttachments = (files = []) =>
  files.map((file) => ({
    url: `/uploads/attachments/${file.filename}`,
    type: file.mimetype,
    name: file.originalname,
  }));

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
  } = req.query;

  const filter = {};

  if (req.user.role === 'employee') {
    filter.assignedTo = req.user._id;
  } else if (employee) {
    filter.assignedTo = employee;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { remarks: { $regex: search, $options: 'i' } },
    ];
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
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    assignedTo: req.user._id,
    taskDate: { $gte: yesterday, $lte: endOfYesterday },
  }).populate(POPULATE_FIELDS);

  res.json({ success: true, data: tasks });
});

// GET /tasks/:id
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate(POPULATE_FIELDS);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (req.user.role === 'employee' && !task.assignedTo._id.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to view this task');
  }

  res.json({ success: true, data: task });
});

// POST /tasks
const createTask = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  const assignedTo = req.user.role === 'employee' ? req.user._id : body.assignedTo || req.user._id;

  if (!body.totalHours) {
    body.totalHours = computeTotalHours(body.startTime, body.endTime);
  }

  const task = await Task.create({
    ...body,
    assignedTo,
    createdBy: req.user._id,
    attachments: buildAttachments(req.files),
  });

  const populated = await task.populate(POPULATE_FIELDS);

  await logActivity(req.user._id, 'create-task', { taskId: task._id.toString(), title: task.title }, req.ip);

  await notifyManagersAndAdmins({
    employee: populated.assignedTo,
    title: 'New task created',
    message: `${populated.assignedTo.name} created a task: "${task.title}"`,
    type: 'task',
    link: `/tasks/${task._id}`,
    relatedId: task._id,
  });

  res.status(201).json({ success: true, data: populated });
});

// PUT /tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo', 'name manager');

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (req.user.role === 'employee' && !task.assignedTo._id.equals(req.user._id)) {
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

  if (req.user.role === 'superadmin' && req.body.assignedTo) {
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

  await notifyManagersAndAdmins({
    employee: populated.assignedTo,
    title: 'Task updated',
    message: `${populated.assignedTo.name} updated task: "${task.title}"`,
    type: 'task',
    link: `/tasks/${task._id}`,
    relatedId: task._id,
  });

  res.json({ success: true, data: populated });
});

// DELETE /tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo', 'name manager');

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (req.user.role === 'employee' && !task.assignedTo._id.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to delete this task');
  }

  await task.deleteOne();

  await logActivity(req.user._id, 'delete-task', { taskId: req.params.id, title: task.title }, req.ip);

  await notifyManagersAndAdmins({
    employee: task.assignedTo,
    title: 'Task deleted',
    message: `${task.assignedTo.name} deleted task: "${task.title}"`,
    type: 'task',
    relatedId: task._id,
  });

  res.json({ success: true, data: { message: 'Task deleted successfully' } });
});

// PATCH /tasks/:id/status
const patchStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo', 'name manager');

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (req.user.role === 'employee' && !task.assignedTo._id.equals(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to update this task');
  }

  task.status = req.body.status;
  if (req.body.status === 'completed' && !task.actualCompletion) {
    task.actualCompletion = new Date();
  }

  await task.save();
  const populated = await task.populate(POPULATE_FIELDS);

  await logActivity(req.user._id, 'update-task-status', { taskId: task._id.toString(), status: task.status }, req.ip);

  await notifyManagersAndAdmins({
    employee: populated.assignedTo,
    title: 'Task status changed',
    message: `${populated.assignedTo.name} marked "${task.title}" as ${task.status}`,
    type: 'task',
    link: `/tasks/${task._id}`,
    relatedId: task._id,
  });

  res.json({ success: true, data: populated });
});

// POST /tasks/:id/duplicate
const duplicateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (req.user.role === 'employee' && !task.assignedTo.equals(req.user._id)) {
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
  if (req.user.role === 'employee') {
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
  if (req.user.role === 'employee') {
    filter.assignedTo = req.user._id;
  }

  const result = await Task.deleteMany(filter);

  await logActivity(req.user._id, 'bulk-delete-tasks', { ids, deletedCount: result.deletedCount }, req.ip);

  res.json({ success: true, data: { deleted: result.deletedCount } });
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
};
