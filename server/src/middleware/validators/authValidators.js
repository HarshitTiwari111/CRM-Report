const { body, param } = require('express-validator');

// Minimum 8 chars with at least one lowercase, one uppercase and one digit.
const strongPassword = (field) =>
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain a number');

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  strongPassword('password'),
];

const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const resetPasswordValidator = [
  param('token').notEmpty().withMessage('Reset token is required'),
  strongPassword('password'),
];

const changePasswordValidator = [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  strongPassword('newPassword'),
];

const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const twoFactorLoginValidator = [
  body('tempToken').notEmpty().withMessage('Sign-in session token is required'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('A 6-digit code is required'),
];

const twoFactorCodeValidator = [
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('A 6-digit code is required'),
];

module.exports = {
  loginValidator,
  registerValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  refreshValidator,
  twoFactorLoginValidator,
  twoFactorCodeValidator,
};
