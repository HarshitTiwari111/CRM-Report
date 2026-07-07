const express = require('express');
const { exportPDF, exportExcel, exportCSV } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/pdf', exportPDF);
router.get('/excel', exportExcel);
router.get('/csv', exportCSV);

module.exports = router;
