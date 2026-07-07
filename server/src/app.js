const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sanitizeRequest } = require('./utils/sanitize');
const { authLimiter, generalLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequest);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
