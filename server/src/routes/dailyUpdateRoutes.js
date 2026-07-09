const express = require('express');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { listDailyUpdates, createDailyUpdate } = require('../controllers/dailyUpdateController');

const router = express.Router();

router.use(protect);

router.get('/', listDailyUpdates);
router.post('/', createDailyUpdate);

router.all('*', asyncHandler(async (req, res) => {
  throw new ApiError(405, 'Method not allowed');
}));

module.exports = router;
