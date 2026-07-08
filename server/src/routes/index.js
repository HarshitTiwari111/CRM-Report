const express = require('express');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const departmentRoutes = require('./departmentRoutes');
const teamRoutes = require('./teamRoutes');
const projectRoutes = require('./projectRoutes');
const clientRoutes = require('./clientRoutes');
const taskCategoryRoutes = require('./taskCategoryRoutes');
const taskRoutes = require('./taskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');
const activityLogRoutes = require('./activityLogRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const holidayRoutes = require('./holidayRoutes');
const calendarRoutes = require('./calendarRoutes');
const settingsRoutes = require('./settingsRoutes');
const googleSheetRoutes = require('./googleSheetRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/teams', teamRoutes);
router.use('/projects', projectRoutes);
router.use('/clients', clientRoutes);
router.use('/task-categories', taskCategoryRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/holidays', holidayRoutes);
router.use('/calendar', calendarRoutes);
router.use('/settings', settingsRoutes);
router.use('/google-sheets', googleSheetRoutes);

module.exports = router;
