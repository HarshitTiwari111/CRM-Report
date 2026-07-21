const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sanitizeRequest } = require('./utils/sanitize');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Behind Render/Cloudflare/nginx the client IP arrives via X-Forwarded-For.
// Needed for accurate rate limiting, audit logs and device tracking.
if (isProduction) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // HSTS only makes sense over HTTPS; enable in production
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Strict CORS: only the configured client origin is allowed.
// Requests without an Origin header (curl, server-to-server, same-origin
// through the Vite proxy) are unaffected by CORS and pass through.
const allowedOrigin = process.env.CLIENT_URL;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeRequest);

// Uploaded files: force download-safe headers so a smuggled HTML/JS payload
// can never execute in the app's origin.
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'");
    },
  })
);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api', generalLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
