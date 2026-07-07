const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLogger');

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

// GET /settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({ success: true, data: settings });
});

// PUT /settings
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();

  const { companyName, logo, timezone, dateFormat, workingDays, officeHours, theme } = req.body;

  if (companyName !== undefined) settings.companyName = companyName;
  if (logo !== undefined) settings.logo = logo;
  if (timezone !== undefined) settings.timezone = timezone;
  if (dateFormat !== undefined) settings.dateFormat = dateFormat;
  if (workingDays !== undefined) settings.workingDays = workingDays;
  if (officeHours !== undefined) settings.officeHours = { ...settings.officeHours.toObject(), ...officeHours };
  if (theme !== undefined) settings.theme = theme;

  await settings.save();
  await logActivity(req.user._id, 'update-settings', {}, req.ip);

  res.json({ success: true, data: settings });
});

module.exports = { getSettings, updateSettings };
