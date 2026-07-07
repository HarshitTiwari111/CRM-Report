const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Not authorized, token invalid or expired');
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'Not authorized, user not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact an administrator.');
  }

  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = { protect, authorize };
