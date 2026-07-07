const express = require('express');
const { getCalendar } = require('../controllers/holidayController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getCalendar);

module.exports = router;
