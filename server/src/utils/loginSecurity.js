const crypto = require('crypto');
const { logActivity } = require('./activityLogger');
const { sendSecurityAlertEmail } = require('./email');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const MAX_KNOWN_DEVICES = 10;

const deviceHashFor = (req) => {
  const ua = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || '';
  return crypto.createHash('sha256').update(`${ua}|${ip}`).digest('hex');
};

const isLocked = (user) => Boolean(user.lockUntil && user.lockUntil > new Date());

const lockRemainingMinutes = (user) =>
  Math.max(1, Math.ceil((user.lockUntil - Date.now()) / 60000));

// Called with the user doc (loaded with +failedLoginAttempts +lockUntil).
// Returns true if this failure locked the account.
const registerFailedLogin = async (user, req) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

  let locked = false;
  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    user.failedLoginAttempts = 0;
    locked = true;
  }

  await user.save();

  await logActivity(
    user._id,
    locked ? 'account-locked' : 'login-failed',
    { email: user.email, attempts: user.failedLoginAttempts || MAX_FAILED_ATTEMPTS },
    req.ip
  );

  if (locked) {
    await sendSecurityAlertEmail(user.email, {
      subject: 'Account temporarily locked',
      lines: [
        `Your account was locked for ${LOCK_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} failed sign-in attempts.`,
        `IP address: ${req.ip || 'unknown'}`,
        'If this was not you, reset your password immediately.',
      ],
    });
  }

  return locked;
};

const resetFailedLogins = async (user) => {
  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }
};

// Records the device used for a successful login. Sends an alert (and logs)
// when the device was not seen before for this user.
const trackLoginDevice = async (user, req) => {
  const hash = deviceHashFor(req);
  const now = new Date();
  const devices = user.knownDevices || [];
  const known = devices.find((d) => d.deviceHash === hash);

  if (known) {
    known.lastSeen = now;
    known.ip = req.ip || known.ip;
    return false;
  }

  devices.push({
    deviceHash: hash,
    userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 300),
    ip: req.ip || '',
    firstSeen: now,
    lastSeen: now,
  });

  // Keep only the most recent devices
  while (devices.length > MAX_KNOWN_DEVICES) {
    devices.sort((a, b) => new Date(a.lastSeen) - new Date(b.lastSeen));
    devices.shift();
  }
  user.knownDevices = devices;

  const isFirstDevice = devices.length === 1;
  if (!isFirstDevice) {
    await logActivity(
      user._id,
      'login-new-device',
      { email: user.email, userAgent: req.headers['user-agent'] || 'unknown' },
      req.ip
    );
    await sendSecurityAlertEmail(user.email, {
      subject: 'New device sign-in detected',
      lines: [
        'Your account was just signed in from a device we have not seen before.',
        `Time: ${now.toISOString()}`,
        `IP address: ${req.ip || 'unknown'}`,
        `Device: ${req.headers['user-agent'] || 'unknown'}`,
        'If this was you, no action is needed. If not, change your password immediately.',
      ],
    });
  }

  return !isFirstDevice;
};

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCK_MINUTES,
  isLocked,
  lockRemainingMinutes,
  registerFailedLogin,
  resetFailedLogins,
  trackLoginDevice,
};
