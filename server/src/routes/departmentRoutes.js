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
router.post('/', authorize('superadmin'), nameBodyValidator, validate, createDepartment);
router.put('/:id', authorize('superadmin'), mongoIdParamValidator, validate, updateDepartment);
router.delete('/:id', authorize('superadmin'), mongoIdParamValidator, validate, deleteDepartment);

module.exports = router;
