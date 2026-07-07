const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { scheduleDeadlineReminderJob } = require('./utils/cronJobs');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  scheduleDeadlineReminderJob();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
};

start();
