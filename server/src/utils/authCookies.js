const { msFromExpiry } = require('./jwt');

const REFRESH_COOKIE = 'refreshToken';

// Scoped to /api/auth so the cookie is only sent to auth endpoints.
// httpOnly keeps it out of reach of any script (XSS cannot steal it).
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  path: '/api/auth',
});

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: msFromExpiry(process.env.JWT_REFRESH_EXPIRY || '7d'),
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

module.exports = { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie };
