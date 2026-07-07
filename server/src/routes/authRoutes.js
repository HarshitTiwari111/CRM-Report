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
const {
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  refreshValidator,
} = require('../middleware/validators/authValidators');

const router = express.Router();

router.post('/login', loginValidator, validate, login);
router.post('/refresh', refreshValidator, validate, refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, validate, resetPassword);
router.post('/change-password', protect, changePasswordValidator, validate, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
