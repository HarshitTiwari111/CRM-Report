const express = require('express');
const { listActivityLogs } = require('../controllers/activityLogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('superadmin', 'admin'));

router.get('/', listActivityLogs);

module.exports = router;
