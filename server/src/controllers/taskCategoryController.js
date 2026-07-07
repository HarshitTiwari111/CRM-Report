const TaskCategory = require('../models/TaskCategory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const listTaskCategories = asyncHandler(async (req, res) => {
  const categories = await TaskCategory.find().sort({ name: 1 });
  res.json({ success: true, data: categories });
});

const createTaskCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const existing = await TaskCategory.findOne({ name });
  if (existing) {
    throw new ApiError(409, 'A task category with this name already exists');
  }

  const category = await TaskCategory.create({ name, description });
  await logActivity(req.user._id, 'create-task-category', { name }, req.ip);

  res.status(201).json({ success: true, data: category });
});

const updateTaskCategory = asyncHandler(async (req, res) => {
  const category = await TaskCategory.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Task category not found');
  }

  const { name, description, isActive } = req.body;
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  await logActivity(req.user._id, 'update-task-category', { id: category._id.toString() }, req.ip);

  res.json({ success: true, data: category });
});

const deleteTaskCategory = asyncHandler(async (req, res) => {
  const category = await TaskCategory.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Task category not found');
  }

  await category.deleteOne();
  await logActivity(req.user._id, 'delete-task-category', { id: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'Task category deleted successfully' } });
});

module.exports = { listTaskCategories, createTaskCategory, updateTaskCategory, deleteTaskCategory };
