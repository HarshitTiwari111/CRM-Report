const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordReset = require('../models/PasswordReset');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  generateTwoFactorTempToken,
  verifyTwoFactorTempToken,
  verifyRefreshToken,
  hashToken,
  msFromExpiry,
} = require('../utils/jwt');
const { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } = require('../utils/authCookies');
const { sendPasswordResetEmail } = require('../utils/email');
const { logActivity } = require('../utils/activityLogger');
const {
  isLocked,
  lockRemainingMinutes,
  registerFailedLogin,
  resetFailedLogins,
  trackLoginDevice,
} = require('../utils/loginSecurity');

const BCRYPT_ROUNDS = 12;

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  delete obj.twoFactorSecret;
  delete obj.twoFactorPendingSecret;
  delete obj.knownDevices;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  return obj;
};

const issueSession = async (user, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + msFromExpiry(process.env.JWT_REFRESH_EXPIRY)),
  });

  setRefreshCookie(res, refreshToken);

  return accessToken;
};

const completeLogin = async (user, req, res, activityAction) => {
  await resetFailedLogins(user);
  await trackLoginDevice(user, req);

  user.lastLogin = new Date();
  await user.save();

  const accessToken = await issueSession(user, res);

  await logActivity(user._id, activityAction, { email: user.email }, req.ip);

  return { accessToken, user: sanitizeUser(user) };
};

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +failedLoginAttempts +lockUntil +twoFactorSecret +knownDevices'
  );

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact an administrator.');
  }

  if (isLocked(user)) {
    throw new ApiError(
      423,
      `Account is temporarily locked due to failed sign-in attempts. Try again in ${lockRemainingMinutes(user)} minute(s).`
    );
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const locked = await registerFailedLogin(user, req);
    if (locked) {
      throw new ApiError(423, 'Too many failed attempts. Account locked for 15 minutes.');
    }
    throw new ApiError(401, 'Invalid email or password');
  }

  // Password OK. If 2FA is on, do not issue tokens yet.
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = generateTwoFactorTempToken(user);
    await logActivity(user._id, 'login-2fa-challenge', { email: user.email }, req.ip);
    return res.json({ success: true, data: { requiresTwoFactor: true, tempToken } });
  }

  const data = await completeLogin(user, req, res, 'login');
  res.json({ success: true, data });
});

// POST /auth/2fa/verify-login
const verifyTwoFactorLogin = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;

  let decoded;
  try {
    decoded = verifyTwoFactorTempToken(tempToken);
  } catch (err) {
    throw new ApiError(401, 'Your sign-in session expired. Please sign in again.');
  }

  const user = await User.findById(decoded.id).select(
    '+twoFactorSecret +failedLoginAttempts +lockUntil +knownDevices'
  );

  if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new ApiError(401, 'Your sign-in session expired. Please sign in again.');
  }

  if (isLocked(user)) {
    throw new ApiError(
      423,
      `Account is temporarily locked. Try again in ${lockRemainingMinutes(user)} minute(s).`
    );
  }

  const valid = authenticator.verify({ token: String(code || ''), secret: user.twoFactorSecret });
  if (!valid) {
    const locked = await registerFailedLogin(user, req);
    if (locked) {
      throw new ApiError(423, 'Too many failed attempts. Account locked for 15 minutes.');
    }
    throw new ApiError(401, 'Invalid authentication code');
  }

  const data = await completeLogin(user, req, res, 'login-2fa');
  res.json({ success: true, data });
});

// POST /auth/refresh — reads the HttpOnly cookie and rotates it
const refresh = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;

  if (!presented) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(presented);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(presented);
  const stored = await RefreshToken.findOne({ user: decoded.id, tokenHash, revoked: false });

  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // Rotation: the presented token is single-use
  stored.revoked = true;
  await stored.save();

  const accessToken = await issueSession(user, res);

  res.json({ success: true, data: { accessToken } });
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;

  if (presented) {
    const tokenHash = hashToken(presented);
    await RefreshToken.updateMany({ tokenHash }, { revoked: true });
  }

  clearRefreshCookie(res);

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

  const user = await User.findById(resetDoc.user).select('+failedLoginAttempts +lockUntil');
  if (!user) {
    throw new ApiError(400, 'Reset token is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await resetFailedLogins(user);
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

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();

  // Invalidate every other session; the current client re-authenticates with
  // the fresh session issued below.
  await RefreshToken.updateMany({ user: user._id }, { revoked: true });
  const accessToken = await issueSession(user, res);

  await logActivity(req.user._id, 'change-password', {}, req.ip);

  res.json({ success: true, data: { message: 'Password changed successfully', accessToken } });
});

// GET /auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('department', 'name')
    .populate('team', 'name')
    .populate('manager', 'name email');

  res.json({ success: true, data: sanitizeUser(user) });
});

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone: phone || undefined,
    role: 'employee',
  });

  user.lastLogin = new Date();
  await trackLoginDevice(user, req);
  await user.save();

  const accessToken = await issueSession(user, res);

  await logActivity(user._id, 'register', { email: user.email }, req.ip);

  res.status(201).json({
    success: true,
    data: { accessToken, user: sanitizeUser(user) },
  });
});

// ---------------------------------------------------------------------------
// Two-factor authentication management (all require an authenticated session)
// ---------------------------------------------------------------------------

// POST /auth/2fa/setup — generate a secret and QR code, pending verification
const setupTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorPendingSecret');

  if (user.twoFactorEnabled) {
    throw new ApiError(400, 'Two-factor authentication is already enabled');
  }

  const secret = authenticator.generateSecret();
  user.twoFactorPendingSecret = secret;
  await user.save();

  const otpauthUrl = authenticator.keyuri(user.email, 'TaskPulse CRM', secret);
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

  res.json({ success: true, data: { otpauthUrl, qrDataUrl, secret } });
});

// POST /auth/2fa/enable — verify a code against the pending secret
const enableTwoFactor = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const user = await User.findById(req.user._id).select('+twoFactorPendingSecret');

  if (!user.twoFactorPendingSecret) {
    throw new ApiError(400, 'Start 2FA setup first');
  }

  const valid = authenticator.verify({
    token: String(code || ''),
    secret: user.twoFactorPendingSecret,
  });
  if (!valid) {
    throw new ApiError(400, 'Invalid authentication code. Scan the QR code and try again.');
  }

  user.twoFactorSecret = user.twoFactorPendingSecret;
  user.twoFactorPendingSecret = undefined;
  user.twoFactorEnabled = true;
  await user.save();

  await logActivity(user._id, 'enable-2fa', {}, req.ip);

  res.json({ success: true, data: { message: 'Two-factor authentication enabled' } });
});

// POST /auth/2fa/disable — requires current password + a valid code
const disableTwoFactor = asyncHandler(async (req, res) => {
  const { password, code } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash +twoFactorSecret');

  if (!user.twoFactorEnabled) {
    throw new ApiError(400, 'Two-factor authentication is not enabled');
  }

  const isMatch = await bcrypt.compare(password || '', user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, 'Password is incorrect');
  }

  const valid = authenticator.verify({ token: String(code || ''), secret: user.twoFactorSecret });
  if (!valid) {
    throw new ApiError(400, 'Invalid authentication code');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorPendingSecret = undefined;
  await user.save();

  await logActivity(user._id, 'disable-2fa', {}, req.ip);

  res.json({ success: true, data: { message: 'Two-factor authentication disabled' } });
});

module.exports = {
  login,
  register,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  verifyTwoFactorLogin,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
};
