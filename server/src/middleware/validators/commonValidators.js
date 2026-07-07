const { body, param } = require('express-validator');

const nameBodyValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
];

const mongoIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid id'),
];

module.exports = { nameBodyValidator, mongoIdParamValidator };
