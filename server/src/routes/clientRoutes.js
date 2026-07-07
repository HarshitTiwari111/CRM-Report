const express = require('express');
const { listClients, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { nameBodyValidator, mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.get('/', listClients);
router.post('/', authorize('superadmin'), nameBodyValidator, validate, createClient);
router.put('/:id', authorize('superadmin'), mongoIdParamValidator, validate, updateClient);
router.delete('/:id', authorize('superadmin'), mongoIdParamValidator, validate, deleteClient);

module.exports = router;
