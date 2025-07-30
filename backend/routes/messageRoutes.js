const express = require('express');
const router = express.Router();
const messageController = require('../controller/messageController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ✅ Ensure consistent uploads directory path
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// ===============================
// 🖼️ Upload config for text/image
// ===============================
const uploadTextImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});

// ===============================
// 🎤 Upload config for voice notes
// ===============================
const uploadVoice = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mpeg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type'), false); // Return an error for clarity
    }
    cb(null, true);
  }
});

// =======================
// 🚀 API Routes
// =======================
router.post(
  '/send-text-image',
  uploadTextImage.fields([{ name: 'image', maxCount: 1 }]),
  messageController.sendTextOrImage
);

router.post(
  '/send-voice',
  uploadVoice.fields([{ name: 'voice_note', maxCount: 1 }]),
  messageController.sendVoice
);

module.exports = router;
