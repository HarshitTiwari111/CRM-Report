const express = require('express');
const GoogleSheetConfig = require('../models/GoogleSheetConfig');
const GoogleSheetTask = require('../models/GoogleSheetTask');
const { syncSingleSheet } = require('../utils/googleSyncService');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const router = express.Router();

// POST /api/google-sheets/webhook-sync - Google Apps Script webhook to sync private sheets
router.post(
  '/webhook-sync',
  asyncHandler(async (req, res) => {
    const { url, rows } = req.body;
    if (!url || !rows || rows.length === 0) {
      throw new ApiError(400, 'Invalid payload: url and rows are required');
    }

    const { extractSheetInfo } = require('../utils/googleSyncService');
    const incomingInfo = extractSheetInfo(url);
    if (!incomingInfo) {
      throw new ApiError(400, 'Invalid Google Sheet URL format');
    }

    const configs = await GoogleSheetConfig.find();
    let matchedConfig = null;
    for (const cfg of configs) {
      const info = extractSheetInfo(cfg.url);
      if (info && info.sheetId === incomingInfo.sheetId) {
        matchedConfig = cfg;
        break;
      }
    }

    if (!matchedConfig) {
      throw new ApiError(404, 'No matching Google Sheet configuration found in CRM');
    }

    const headers = rows[0].map((h) => String(h).replace(/^\uFEFF/, '').trim());
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx] ?? '';
      });
      data.push(obj);
    }

    // 1. Delete all existing tasks for this configuration
    await GoogleSheetTask.deleteMany({ config: matchedConfig._id });

    // 2. Prepare new tasks for insertion
    const tasksToInsert = data.map((row, index) => ({
      config: matchedConfig._id,
      rowNumber: index + 1,
      data: row,
    }));

    // 3. Bulk insert to database
    if (tasksToInsert.length > 0) {
      await GoogleSheetTask.insertMany(tasksToInsert);
    }

    // 4. Update configuration
    matchedConfig.headers = headers;
    matchedConfig.lastSyncedAt = new Date();
    matchedConfig.syncError = '';
    await matchedConfig.save();

    res.json({ success: true, data: { count: tasksToInsert.length } });
  })
);

// Apply auth middleware to all other routes
router.use(protect);

// GET /api/google-sheets - Get all sheet configs (usually just one)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const configs = await GoogleSheetConfig.find().sort({ createdAt: -1 });
    res.json({ success: true, data: configs });
  })
);

// POST /api/google-sheets - Add or update a sheet config
router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      throw new ApiError(403, 'Access denied. Superadmins only.');
    }

    const { url, name, syncMode } = req.body;
    if (!url) {
      throw new ApiError(400, 'Google Sheet URL is required');
    }

    // Find existing or create
    let config = await GoogleSheetConfig.findOne();
    if (config) {
      config.url = url;
      if (name) config.name = name;
      if (syncMode) config.syncMode = syncMode;
      // Clear previous sync error when URL/mode changes
      config.syncError = '';
    } else {
      config = new GoogleSheetConfig({
        url,
        name: name || 'Tasks Sheet',
        syncMode: syncMode || 'pull',
      });
    }

    await config.save();

    // Try initial sync immediately (only for public pull-mode sheets)
    if (config.syncMode === 'pull') {
      try {
        await syncSingleSheet(config);
      } catch (err) {
        config.syncError = err.message;
        await config.save();
      }
    }

    res.status(201).json({ success: true, data: config });
  })
);

// POST /api/google-sheets/:id/sync - Force sync now
router.post(
  '/:id/sync',
  asyncHandler(async (req, res) => {
    const config = await GoogleSheetConfig.findById(req.params.id);
    if (!config) {
      throw new ApiError(404, 'Configuration not found');
    }

    try {
      const result = await syncSingleSheet(config);
      res.json({ success: true, data: { message: 'Synced successfully', count: result.count } });
    } catch (err) {
      config.syncError = err.message;
      await config.save();
      throw new ApiError(400, `Sync failed: ${err.message}`);
    }
  })
);

// GET /api/google-sheets/:id/tasks - Get dynamic tasks
router.get(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const config = await GoogleSheetConfig.findById(req.params.id);
    if (!config) {
      throw new ApiError(404, 'Configuration not found');
    }

    const { page = 1, limit = 20, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const filter = { config: config._id };

    if (search && config.headers && config.headers.length > 0) {
      const regex = new RegExp(search, 'i');
      filter.$or = config.headers.map((header) => ({
        [`data.${header}`]: { $regex: regex },
      }));
    }

    const [tasks, total] = await Promise.all([
      GoogleSheetTask.find(filter)
        .sort({ rowNumber: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      GoogleSheetTask.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// DELETE /api/google-sheets/:id - Delete configuration & task entries
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      throw new ApiError(403, 'Access denied. Superadmins only.');
    }

    const config = await GoogleSheetConfig.findById(req.params.id);
    if (!config) {
      throw new ApiError(404, 'Configuration not found');
    }

    await GoogleSheetTask.deleteMany({ config: config._id });
    await config.deleteOne();

    res.json({ success: true, data: { message: 'Google Sheet configuration deleted successfully' } });
  })
);

module.exports = router;
