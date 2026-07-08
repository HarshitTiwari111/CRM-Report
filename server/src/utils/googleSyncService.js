const https = require('https');
const GoogleSheetConfig = require('../models/GoogleSheetConfig');
const GoogleSheetTask = require('../models/GoogleSheetTask');
const { parseCSVString } = require('./csvParser');

const extractSheetInfo = (url) => {
  if (!url) return null;
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const sheetId = idMatch[1];
  const gidMatch = url.match(/[?&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return { sheetId, gid };
};

const fetchCsv = (sheetId, gid) => {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 307) {
        const redirectUrl = res.headers.location;
        https.get(redirectUrl, (res2) => {
          if (res2.statusCode !== 200) {
            return reject(new Error(`Failed to fetch Google Sheet: status ${res2.statusCode}`));
          }
          let data = '';
          res2.on('data', (chunk) => {
            data += chunk;
          });
          res2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch Google Sheet: status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const syncSingleSheet = async (config) => {
  const info = extractSheetInfo(config.url);
  if (!info) {
    throw new Error('Invalid Google Sheet URL format');
  }

  const csvContent = await fetchCsv(info.sheetId, info.gid);
  const { headers, data } = parseCSVString(csvContent);

  if (headers.length === 0) {
    throw new Error('No headers found in the Google Sheet');
  }

  // 1. Delete all existing tasks for this configuration
  await GoogleSheetTask.deleteMany({ config: config._id });

  // 2. Prepare new tasks for insertion
  const tasksToInsert = data.map((row, index) => ({
    config: config._id,
    rowNumber: index + 1,
    data: row,
  }));

  // 3. Bulk insert to database
  if (tasksToInsert.length > 0) {
    await GoogleSheetTask.insertMany(tasksToInsert);
  }

  // 4. Update configuration with headers and last synced status
  config.headers = headers;
  config.lastSyncedAt = new Date();
  config.syncError = '';
  await config.save();

  return { success: true, count: tasksToInsert.length };
};

const syncAllActiveSheets = async () => {
  const configs = await GoogleSheetConfig.find({ isActive: true });
  for (const config of configs) {
    try {
      await syncSingleSheet(config);
    } catch (err) {
      console.error(`Error syncing sheet ${config._id}:`, err.message);
      config.syncError = err.message;
      await config.save();
    }
  }
};

module.exports = {
  syncSingleSheet,
  syncAllActiveSheets,
  extractSheetInfo,
};
