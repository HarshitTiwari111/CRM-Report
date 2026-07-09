const express = require('express');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const departmentRoutes = require('./departmentRoutes');
const clientRoutes = require('./clientRoutes');
const taskRoutes = require('./taskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');
const activityLogRoutes = require('./activityLogRoutes');
const holidayRoutes = require('./holidayRoutes');
const calendarRoutes = require('./calendarRoutes');
const settingsRoutes = require('./settingsRoutes');
const googleSheetRoutes = require('./googleSheetRoutes');
const dailyUpdateRoutes = require('./dailyUpdateRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/clients', clientRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/holidays', holidayRoutes);
router.use('/calendar', calendarRoutes);
router.use('/settings', settingsRoutes);
router.use('/google-sheets', googleSheetRoutes);
router.use('/daily-updates', dailyUpdateRoutes);

module.exports = router;
