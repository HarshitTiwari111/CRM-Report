const express = require('express');
const {
  listTaskCategories,
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory,
} = require('../controllers/taskCategoryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { nameBodyValidator, mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.get('/', listTaskCategories);
router.post('/', authorize('superadmin'), nameBodyValidator, validate, createTaskCategory);
router.put('/:id', authorize('superadmin'), mongoIdParamValidator, validate, updateTaskCategory);
router.delete('/:id', authorize('superadmin'), mongoIdParamValidator, validate, deleteTaskCategory);

module.exports = router;
