const express = require('express');
const { listHolidays, createHoliday, deleteHoliday } = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const { mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

const createHolidayValidator = [
  body('name').trim().notEmpty().withMessage('Holiday name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
];

router.get('/', listHolidays);
router.post('/', authorize('superadmin'), createHolidayValidator, validate, createHoliday);
router.delete('/:id', authorize('superadmin'), mongoIdParamValidator, validate, deleteHoliday);

module.exports = router;
