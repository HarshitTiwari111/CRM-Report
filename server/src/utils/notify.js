const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('../config/socket');

const createNotification = async ({ user, title, message, type = 'other', link = '', relatedId = null }) => {
  const notification = await Notification.create({ user, title, message, type, link, relatedId });
  emitToUser(user.toString(), 'notification:new', notification);
  return notification;
};

/**
 * Notify a specific employee's manager plus all superadmins about a task event.
 */
const notifyManagersAndAdmins = async ({ employee, title, message, type = 'task', link = '', relatedId = null }) => {
  const recipients = new Set();

  if (employee?.manager) {
    recipients.add(employee.manager.toString());
  }

  const admins = await User.find({ role: 'superadmin', isActive: true }).select('_id');
  admins.forEach((admin) => recipients.add(admin._id.toString()));

  const jobs = Array.from(recipients).map((userId) =>
    createNotification({ user: userId, title, message, type, link, relatedId })
  );

  return Promise.all(jobs);
};

module.exports = { createNotification, notifyManagersAndAdmins };
