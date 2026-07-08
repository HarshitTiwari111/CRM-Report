const express = require('express');
const {
  listTasks,
  copyPrevious,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  patchStatus,
  duplicateTask,
  bulkUpdate,
  bulkDelete,
  importCsvTasks,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadAttachments, uploadCsv } = require('../middleware/upload');
const {
  createTaskValidator,
  updateTaskValidator,
  statusPatchValidator,
  bulkUpdateValidator,
  bulkDeleteValidator,
} = require('../middleware/validators/taskValidators');
const { mongoIdParamValidator } = require('../middleware/validators/commonValidators');

const router = express.Router();

router.use(protect);

router.post('/import-csv', uploadCsv, importCsvTasks);
router.get('/copy-previous', copyPrevious);
router.get('/', listTasks);
router.post('/', uploadAttachments, createTaskValidator, validate, createTask);

router.post('/bulk-update', bulkUpdateValidator, validate, bulkUpdate);
router.post('/bulk-delete', bulkDeleteValidator, validate, bulkDelete);

router.get('/:id', mongoIdParamValidator, validate, getTask);
router.put('/:id', uploadAttachments, updateTaskValidator, validate, updateTask);
router.delete('/:id', mongoIdParamValidator, validate, deleteTask);
router.patch('/:id/status', statusPatchValidator, validate, patchStatus);
router.post('/:id/duplicate', mongoIdParamValidator, validate, duplicateTask);

module.exports = router;
