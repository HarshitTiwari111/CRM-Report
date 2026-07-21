const express = require('express');
const { adminDashboard, employeeDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/admin', authorize('superadmin', 'admin'), adminDashboard);
router.get('/employee', employeeDashboard);

module.exports = router;
