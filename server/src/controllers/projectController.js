const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().populate('client', 'name').populate('department', 'name').sort({ name: 1 });
  res.json({ success: true, data: projects });
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description, client, department, startDate, endDate, status } = req.body;

  const project = await Project.create({ name, description, client, department, startDate, endDate, status });
  await logActivity(req.user._id, 'create-project', { name }, req.ip);

  res.status(201).json({ success: true, data: project });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const { name, description, client, department, startDate, endDate, status, isActive } = req.body;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (client !== undefined) project.client = client || undefined;
  if (department !== undefined) project.department = department || undefined;
  if (startDate !== undefined) project.startDate = startDate;
  if (endDate !== undefined) project.endDate = endDate;
  if (status !== undefined) project.status = status;
  if (isActive !== undefined) project.isActive = isActive;

  await project.save();
  await logActivity(req.user._id, 'update-project', { id: project._id.toString() }, req.ip);

  res.json({ success: true, data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  await project.deleteOne();
  await logActivity(req.user._id, 'delete-project', { id: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'Project deleted successfully' } });
});

module.exports = { listProjects, createProject, updateProject, deleteProject };
