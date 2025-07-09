const express = require('express');
const router = express.Router();
const messageController = require('../controller/messageController');
const multer = require('multer');
const fs = require('fs'); // ✅ Required for directory check

// ===============================
// 🖼️ Upload config for text/image
// ===============================
const uploadTextImage = multer({
  storage: multer.diskStorage({
    
    destination: (req, file, cb) => {
      const dir = './uploads';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
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
      const dir = './uploads';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mpeg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(null, false); // Reject unsupported types
    }
    cb(null, true);
  }
});

// =======================
// 🚀 API Routes
// =======================
router.post(
  '/send-text-image',
  uploadTextImage.fields([{ name: 'image' }]),
  messageController.sendTextOrImage
);

router.post(
  '/send-voice',
  uploadVoice.fields([{ name: 'voice_note', maxCount: 1 }]),
  messageController.sendVoice
);

module.exports = router;
