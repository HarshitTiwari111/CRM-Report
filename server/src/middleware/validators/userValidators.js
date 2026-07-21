const { body, param } = require('express-validator');

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isString(),
  body('department').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid department id'),
  body('designation').optional().isString(),
  body('manager').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid manager id'),
  body('joiningDate').optional().isISO8601().withMessage('Invalid joining date'),
  body('role').optional().isIn(['superadmin', 'admin', 'manager', 'employee']).withMessage('Invalid role'),
];

const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('department').optional({ checkFalsy: true }).isMongoId(),
  body('manager').optional({ checkFalsy: true }).isMongoId(),
];

const statusValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
];

const resetPasswordValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const assignValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('department').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('team').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('manager').optional({ nullable: true, checkFalsy: true }).isMongoId(),
];

const selfProfileValidator = [
  body('name').optional().trim().notEmpty(),
  body('phone').optional().isString(),
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  statusValidator,
  resetPasswordValidator,
  assignValidator,
  selfProfileValidator,
};
