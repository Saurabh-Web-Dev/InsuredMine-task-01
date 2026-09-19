const { runImportWorker } = require('../services/importService');

// POST /api/upload  (multipart/form-data, field: file)
async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded. Use form field "file".' });
    const summary = await runImportWorker(req.file.path);
    res.json({ success: true, message: 'Import completed', summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile };
