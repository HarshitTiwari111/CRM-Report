const express = require('express');
const {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', mongoIdParamValidator, validate, markRead);
router.delete('/:id', mongoIdParamValidator, validate, deleteNotification);

module.exports = router;
