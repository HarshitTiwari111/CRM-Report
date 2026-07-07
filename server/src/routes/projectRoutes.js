const express = require('express');
const { listProjects, createProject, updateProject, deleteProject } = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { nameBodyValidator, mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.get('/', listProjects);
router.post('/', authorize('superadmin'), nameBodyValidator, validate, createProject);
router.put('/:id', authorize('superadmin'), mongoIdParamValidator, validate, updateProject);
router.delete('/:id', authorize('superadmin'), mongoIdParamValidator, validate, deleteProject);

module.exports = router;
