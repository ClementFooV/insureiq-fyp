const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

// Ensure uploads/claims directory exists
const uploadDir = path.join(__dirname, '../uploads/claims');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
  }
});

module.exports = (pool) => {
  const router = express.Router();
  const c = require('../controllers/claimController')(pool);

  router.post('/',          authMiddleware, requireRole('individual'), upload.array('documents', 5), c.submitClaim);
  router.get('/my',         authMiddleware, requireRole('individual'), c.getMyClaims);
  router.get('/provider',   authMiddleware, requireRole('provider'),   c.getProviderClaims);
  router.put('/:id/status', authMiddleware, requireRole('provider'),   c.updateClaimStatus);
  router.get('/admin/all',  authMiddleware, requireRole('admin'),      c.getAllClaims);

  return router;
};
