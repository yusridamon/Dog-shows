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
// plus localhost). Falls back to http://localhost:3000 for local dev.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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
