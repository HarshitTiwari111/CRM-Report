const { body, param } = require('express-validator');

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_TYPES = [
  'development',
  'bugfix',
  'meeting',
  'testing',
  'research',
  'design',
  'support',
  'deployment',
  'documentation',
  'training',
  'other',
];
const STATUSES = ['pending', 'in-progress', 'completed', 'hold', 'cancelled'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('project').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('client').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('department').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('assignedTo').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('taskType').optional().isIn(TASK_TYPES).withMessage('Invalid task type'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('taskDate').optional().isISO8601().withMessage('Invalid task date'),
  body('startTime').optional({ nullable: true, checkFalsy: true }).matches(TIME_REGEX).withMessage('Invalid start time'),
  body('endTime').optional({ nullable: true, checkFalsy: true }).matches(TIME_REGEX).withMessage('Invalid end time'),
  body('expectedCompletion').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

const updateTaskValidator = [
  param('id').isMongoId().withMessage('Invalid task id'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('taskType').optional().isIn(TASK_TYPES).withMessage('Invalid task type'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('startTime').optional({ nullable: true, checkFalsy: true }).matches(TIME_REGEX).withMessage('Invalid start time'),
  body('endTime').optional({ nullable: true, checkFalsy: true }).matches(TIME_REGEX).withMessage('Invalid end time'),
];

const statusPatchValidator = [
  param('id').isMongoId().withMessage('Invalid task id'),
  body('status').isIn(STATUSES).withMessage('Invalid status'),
];

const bulkUpdateValidator = [
  body('ids').isArray({ min: 1 }).withMessage('ids must be a non-empty array'),
  body('ids.*').isMongoId().withMessage('Invalid task id in ids'),
  body('update').isObject().withMessage('update must be an object'),
];

const bulkDeleteValidator = [
  body('ids').isArray({ min: 1 }).withMessage('ids must be a non-empty array'),
  body('ids.*').isMongoId().withMessage('Invalid task id in ids'),
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  statusPatchValidator,
  bulkUpdateValidator,
  bulkDeleteValidator,
  PRIORITIES,
  TASK_TYPES,
  STATUSES,
};
