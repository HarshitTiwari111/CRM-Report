const path = require('path');
// Force-load local .env values. This prevents OS/terminal-level env vars
// (like MONGO_URI) from overriding what you set for local development.
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
  override: true,
});
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { scheduleDeadlineReminderJob, scheduleGoogleSyncJob } = require('./utils/cronJobs');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  scheduleDeadlineReminderJob();
  scheduleGoogleSyncJob();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
};

start();
