const Team = require('../models/Team');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const listTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find().populate('department', 'name').populate('teamLead', 'name email').sort({ name: 1 });
  res.json({ success: true, data: teams });
});

const createTeam = asyncHandler(async (req, res) => {
  const { name, department, teamLead, description } = req.body;

  const team = await Team.create({ name, department, teamLead, description });
  await logActivity(req.user._id, 'create-team', { name }, req.ip);

  res.status(201).json({ success: true, data: team });
});

const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const { name, department, teamLead, description, isActive } = req.body;
  if (name !== undefined) team.name = name;
  if (department !== undefined) team.department = department || undefined;
  if (teamLead !== undefined) team.teamLead = teamLead || undefined;
  if (description !== undefined) team.description = description;
  if (isActive !== undefined) team.isActive = isActive;

  await team.save();
  await logActivity(req.user._id, 'update-team', { id: team._id.toString() }, req.ip);

  res.json({ success: true, data: team });
});

const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  await team.deleteOne();
  await logActivity(req.user._id, 'delete-team', { id: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'Team deleted successfully' } });
});

module.exports = { listTeams, createTeam, updateTeam, deleteTeam };
