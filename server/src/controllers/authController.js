const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordReset = require('../models/PasswordReset');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  msFromExpiry,
} = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');
const { logActivity } = require('../utils/activityLogger');

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
};

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact an administrator.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + msFromExpiry(process.env.JWT_REFRESH_EXPIRY)),
  });

  user.lastLogin = new Date();
  await user.save();

  await logActivity(user._id, 'login', { email: user.email }, req.ip);

  res.json({
    success: true,
    data: { accessToken, refreshToken, user: sanitizeUser(user) },
  });
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await RefreshToken.findOne({ user: decoded.id, tokenHash, revoked: false });

  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const accessToken = generateAccessToken(user);

  res.json({ success: true, data: { accessToken } });
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateMany({ tokenHash }, { revoked: true });
  }

  if (req.user) {
    await logActivity(req.user._id, 'logout', {}, req.ip);
  }

  res.status(204).send();
});

// POST /auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond success to avoid leaking which emails exist
  if (!user) {
    return res.json({
      success: true,
      data: { message: 'If that email exists, a reset link has been sent.' },
    });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await PasswordReset.create({
    user: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;

  await sendPasswordResetEmail(user.email, resetLink);
  await logActivity(user._id, 'forgot-password-request', { email: user.email }, req.ip);

  res.json({
    success: true,
    data: { message: 'If that email exists, a reset link has been sent.' },
  });
});

// POST /auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const tokenHash = hashToken(token);
  const resetDoc = await PasswordReset.findOne({ tokenHash, used: false });

  if (!resetDoc || resetDoc.expiresAt < new Date()) {
    throw new ApiError(400, 'Reset token is invalid or has expired');
  }

  const user = await User.findById(resetDoc.user);
  if (!user) {
    throw new ApiError(400, 'Reset token is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();

  resetDoc.used = true;
  await resetDoc.save();

  await RefreshToken.updateMany({ user: user._id }, { revoked: true });

  await logActivity(user._id, 'reset-password', {}, req.ip);

  res.json({ success: true, data: { message: 'Password has been reset successfully' } });
});

// POST /auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, 'Old password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  await logActivity(user._id, 'change-password', {}, req.ip);

  res.json({ success: true, data: { message: 'Password changed successfully' } });
});

// GET /auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('department', 'name')
    .populate('team', 'name')
    .populate('manager', 'name email');

  res.json({ success: true, data: sanitizeUser(user) });
});

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
