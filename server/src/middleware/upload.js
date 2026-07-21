const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Extensions that may legitimately carry the mimes above. Blocks e.g. a file
// named "report.html" uploaded with a spoofed image/png content type.
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
];

// Magic-byte signatures per declared mime. A file whose real bytes don't
// match its declared type is rejected after upload.
const MAGIC_BYTES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF container
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // Legacy Office (CFB) or modern Office (ZIP "PK")
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0], [0x50, 0x4b]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4b]],
  'application/vnd.ms-excel': [[0xd0, 0xcf, 0x11, 0xe0], [0x50, 0x4b]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4b]],
};

const matchesMagic = (buffer, signatures) =>
  signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));

// Post-upload check: verify actual file content matches the declared mime.
// CSV/text files have no signature and are skipped.
const verifyFileSignatures = (req, res, next) => {
  const files = [...(req.files || []), ...(req.file ? [req.file] : [])];

  for (const file of files) {
    const signatures = MAGIC_BYTES[file.mimetype];
    if (!signatures) continue;

    let fd;
    try {
      fd = fs.openSync(file.path, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      if (!matchesMagic(buffer, signatures)) {
        files.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {
            /* already gone */
          }
        });
        return res.status(400).json({
          success: false,
          message: `File "${file.originalname}" content does not match its declared type`,
        });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Could not verify uploaded file' });
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  next();
};

const makeStorage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_ROOT, subfolder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${unique}${ext}`);
    },
  });

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type'), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Unsupported file extension'), false);
  }
  cb(null, true);
};

const uploadAttachments = multer({
  storage: makeStorage('attachments'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
}).array('attachments', 5);

const uploadProfilePhoto = multer({
  storage: makeStorage('profiles'),
  fileFilter: (req, file, cb) => {
    // Explicit allowlist — notably excludes image/svg+xml (script-capable)
    const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_MIMES.includes(file.mimetype) || !IMAGE_EXTS.includes(ext)) {
      return cb(new Error('Profile photo must be a JPG, PNG, GIF or WebP image'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('profilePhoto');

const uploadCsv = multer({
  storage: makeStorage('csvs'),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      return cb(null, true);
    }
    cb(new Error('Only CSV files are allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
}).single('file');

const wrapMulter = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    verifyFileSignatures(req, res, next);
  });
};

module.exports = {
  uploadAttachments: wrapMulter(uploadAttachments),
  uploadProfilePhoto: wrapMulter(uploadProfilePhoto),
  uploadCsv: wrapMulter(uploadCsv),
  UPLOAD_ROOT,
};
