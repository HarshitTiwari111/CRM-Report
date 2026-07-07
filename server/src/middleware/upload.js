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
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Profile photo must be an image'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('profilePhoto');

const wrapMulter = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadAttachments: wrapMulter(uploadAttachments),
  uploadProfilePhoto: wrapMulter(uploadProfilePhoto),
  UPLOAD_ROOT,
};
