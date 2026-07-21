const express = require('express');
const {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  setUserStatus,
  adminResetPassword,
  assignUser,
  getUserPerformance,
  updateMyProfile,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadProfilePhoto } = require('../middleware/upload');
const {
  createUserValidator,
  updateUserValidator,
  statusValidator,
  resetPasswordValidator,
  assignValidator,
  selfProfileValidator,
} = require('../middleware/validators/userValidators');
const { mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

// Self-service profile route must be declared before /:id to avoid "me" being parsed as an id
router.put('/me/profile', uploadProfilePhoto, selfProfileValidator, validate, updateMyProfile);

router.get('/', authorize('superadmin', 'admin'), listUsers);
router.post('/', authorize('superadmin', 'admin'), createUserValidator, validate, createUser);
router.get('/:id', authorize('superadmin', 'admin'), mongoIdParamValidator, validate, getUser);
router.put('/:id', authorize('superadmin', 'admin'), updateUserValidator, validate, updateUser);
router.delete('/:id', authorize('superadmin', 'admin'), mongoIdParamValidator, validate, deleteUser);
router.patch('/:id/status', authorize('superadmin', 'admin'), statusValidator, validate, setUserStatus);
router.patch('/:id/reset-password', authorize('superadmin', 'admin'), resetPasswordValidator, validate, adminResetPassword);
router.patch('/:id/assign', authorize('superadmin', 'admin'), assignValidator, validate, assignUser);
router.get('/:id/performance', mongoIdParamValidator, validate, getUserPerformance);

module.exports = router;
