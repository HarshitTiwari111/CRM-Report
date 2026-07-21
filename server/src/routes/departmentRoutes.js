const express = require('express');
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { nameBodyValidator, mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.get('/', listDepartments);
router.post('/', authorize('superadmin', 'admin'), nameBodyValidator, validate, createDepartment);
router.put('/:id', authorize('superadmin', 'admin'), mongoIdParamValidator, validate, updateDepartment);
router.delete('/:id', authorize('superadmin', 'admin'), mongoIdParamValidator, validate, deleteDepartment);

module.exports = router;
