const express = require('express');
const {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  refreshValidator,
} = require('../middleware/validators/authValidators');

const router = express.Router();

// Strict brute-force limiter only on credential-guessing surfaces.
// /refresh and /me are routine session-maintenance calls fired automatically
// by every active tab (silent token refresh, page load) and must not share
// this tight budget, or legitimate sessions get locked out during normal use.
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/refresh', refreshValidator, validate, refresh);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPasswordValidator, validate, resetPassword);
router.post('/change-password', protect, changePasswordValidator, validate, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
