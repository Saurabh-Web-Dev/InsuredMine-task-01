const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');

const { uploadFile } = require('../controllers/uploadController');
const { searchByUsername, aggregateByUser } = require('../controllers/policyController');
const { scheduleMessage, listMessages } = require('../controllers/messageController');

const router = express.Router();

const upload = multer({
  dest: path.join(os.tmpdir(), 'insurance-uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx, .xls or .csv files are allowed'), ok);
  },
});

// Task 1
router.post('/upload', upload.single('file'), uploadFile);
router.get('/policies/search', searchByUsername);
router.get('/policies/aggregate', aggregateByUser);
router.get('/policies/aggregate/:userId', aggregateByUser);

// Task 2
router.post('/messages', scheduleMessage);
router.get('/messages', listMessages);

router.get('/health', (req, res) => res.json({ status: 'ok', pid: process.pid, uptime: process.uptime() }));

module.exports = router;
