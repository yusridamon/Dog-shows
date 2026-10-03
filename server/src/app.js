const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const publicRoutes = require('./routes/public.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const { UPLOADS_BASE } = require('./lib/uploadsDir');

const app = express();

// Trust the first proxy hop (required behind Railway/Cloudflare) so client IPs
// and rate limiting work correctly. Harmless locally.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));

// CLIENT_URL may be a single origin or a comma-separated list (production domain
// plus localhost). Falls back to common localhost dev origins.
const stripSlash = (s) => (s || '').replace(/\/$/, '');
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((o) => stripSlash(o.trim()))
  .filter(Boolean);

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser / same-origin requests (no Origin header).
    if (!origin) return callback(null, true);
    const normalized = stripSlash(origin);
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    // In development, allow any localhost/127.0.0.1 origin so the CRA proxy and
    // direct browser access on any port work without friction.
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded pedigree documents and entry forms (admin views them via the
// portal). Path is configurable via UPLOADS_DIR for a persistent volume in prod.
app.use('/uploads', express.static(UPLOADS_BASE));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  validate: { xForwardedForHeader: false },
});
app.use('/api', limiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Prevent browsers/proxies from caching dynamic API responses (avoids stale
// 304 responses serving pre-configuration data such as an empty class list).
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Multer / generic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 400;
  res.status(status).json({ message: err.message || 'Something went wrong.' });
});

module.exports = app;
