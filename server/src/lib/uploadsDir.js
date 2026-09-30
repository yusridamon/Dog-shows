const path = require('path');

/**
 * Base directory for uploaded files (pedigrees, entry forms).
 *
 * Local dev: defaults to <server>/uploads.
 * Production (Railway): set UPLOADS_DIR to the mounted persistent volume path
 * (e.g. /data) so uploaded documents survive redeploys.
 */
const UPLOADS_BASE = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

module.exports = { UPLOADS_BASE };
