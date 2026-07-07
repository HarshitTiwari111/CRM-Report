const express = require('express');
const { clockIn, clockOut, myAttendance, allAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', myAttendance);
router.get('/', authorize('superadmin'), allAttendance);

module.exports = router;
