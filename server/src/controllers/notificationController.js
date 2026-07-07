const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /notifications
const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const filter = { user: req.user._id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: notifications,
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), unreadCount },
  });
});

// PATCH /notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  notification.isRead = true;
  await notification.save();

  res.json({ success: true, data: notification });
});

// PATCH /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });

  res.json({ success: true, data: { message: 'All notifications marked as read' } });
});

// DELETE /notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  await notification.deleteOne();

  res.json({ success: true, data: { message: 'Notification deleted' } });
});

module.exports = { listNotifications, markRead, markAllRead, deleteNotification };
