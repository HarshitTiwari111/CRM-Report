const express = require('express');
const { listTeams, createTeam, updateTeam, deleteTeam } = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { nameBodyValidator, mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.get('/', listTeams);
router.post('/', authorize('superadmin'), nameBodyValidator, validate, createTeam);
router.put('/:id', authorize('superadmin'), mongoIdParamValidator, validate, updateTeam);
router.delete('/:id', authorize('superadmin'), mongoIdParamValidator, validate, deleteTeam);

module.exports = router;
