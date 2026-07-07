const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const listDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.json({ success: true, data: departments });
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const existing = await Department.findOne({ name });
  if (existing) {
    throw new ApiError(409, 'A department with this name already exists');
  }

  const department = await Department.create({ name, description });
  await logActivity(req.user._id, 'create-department', { name }, req.ip);

  res.status(201).json({ success: true, data: department });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  const { name, description, isActive } = req.body;
  if (name !== undefined) department.name = name;
  if (description !== undefined) department.description = description;
  if (isActive !== undefined) department.isActive = isActive;

  await department.save();
  await logActivity(req.user._id, 'update-department', { id: department._id.toString() }, req.ip);

  res.json({ success: true, data: department });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  await department.deleteOne();
  await logActivity(req.user._id, 'delete-department', { id: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'Department deleted successfully' } });
});

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment };
