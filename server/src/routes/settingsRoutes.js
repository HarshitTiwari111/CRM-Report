const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('superadmin'));

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;
