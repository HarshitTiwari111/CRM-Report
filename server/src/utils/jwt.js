const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// Short-lived token issued after password check when 2FA is still pending.
// It only grants the right to call /auth/2fa/verify-login — never API access.
const generateTwoFactorTempToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), purpose: '2fa-pending' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};

const verifyTwoFactorTempToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== '2fa-pending') {
    throw new Error('Invalid token purpose');
  }
  return decoded;
};

const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // A 2FA-pending token must never be accepted as an access token
  if (decoded.purpose) {
    throw new Error('Invalid token purpose');
  }
  return decoded;
};

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const msFromExpiry = (expiry) => {
  const match = /^(\d+)([smhd])$/.exec(expiry || '7d');
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[unit];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTwoFactorTempToken,
  verifyTwoFactorTempToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  msFromExpiry,
};
