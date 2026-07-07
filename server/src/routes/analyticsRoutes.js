const express = require('express');
const {
  productivity,
  departmentPerformance,
  employeePerformance,
  topPerformers,
  completionTrend,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('superadmin'));

router.get('/productivity', productivity);
router.get('/department-performance', departmentPerformance);
router.get('/employee-performance', employeePerformance);
router.get('/top-performers', topPerformers);
router.get('/completion-trend', completionTrend);

module.exports = router;
