const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { UPLOADS_BASE } = require('../lib/uploadsDir');

const UPLOAD_DIR = path.join(UPLOADS_BASE, 'pedigrees');
const FORM_DIR = path.join(UPLOADS_BASE, 'entry-forms');

// Ensure the upload directories exist.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(FORM_DIR, { recursive: true });

// Pedigree documents are restricted to PDF/JPG/JPEG/PNG.
const PEDIGREE_ALLOWED = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
};

function safeExt(file, allowed) {
  return (allowed && allowed[file.mimetype]) || path.extname(file.originalname) || '';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === 'entryForm' ? FORM_DIR : UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const prefix = file.fieldname === 'entryForm' ? 'entryform' : 'pedigree';
    const allowed = file.fieldname === 'entryForm' ? null : PEDIGREE_ALLOWED;
    const ext = safeExt(file, allowed);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${prefix}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  // The completed official entry form may be uploaded in ANY format.
  if (file.fieldname === 'entryForm') return cb(null, true);
  // Pedigree documents are restricted.
  if (PEDIGREE_ALLOWED[file.mimetype]) return cb(null, true);
  return cb(new Error('Pedigree must be a PDF, JPG, JPEG or PNG file.'));
}

// Accepts an optional pedigree (manual entries) and an entry form (all entries).
const uploadEntryFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
}).fields([
  { name: 'pedigree', maxCount: 1 },
  { name: 'entryForm', maxCount: 1 },
]);

module.exports = { uploadEntryFiles, UPLOAD_DIR, FORM_DIR };
