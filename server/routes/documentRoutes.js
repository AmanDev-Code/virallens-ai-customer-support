const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UserDocument = require('../models/UserDocument');
const auth = require('../middleware/auth');
const { generateEmbedding } = require('../services/ragService');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

// Upload Document with 10MB user quota check
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const userId = req.user.userId;
    const fileSize = req.file.size;

    // Check total storage used by user (10MB = 10,485,760 bytes)
    const userDocs = await UserDocument.find({ userId });
    const currentTotalBytes = userDocs.reduce((sum, doc) => sum + doc.size, 0);
    const MAX_QUOTA_BYTES = 10 * 1024 * 1024; // 10 MB

    if (currentTotalBytes + fileSize > MAX_QUOTA_BYTES) {
      // Remove uploaded temp file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Storage quota exceeded! You have used ${(currentTotalBytes / (1024 * 1024)).toFixed(2)}MB of your 10MB limit. Delete some documents to free up memory.`
      });
    }

    // Read text content if txt/json/md, or mock sample for binaries
    let extractedText = '';
    try {
      if (req.file.mimetype.includes('text') || req.file.originalname.endsWith('.md') || req.file.originalname.endsWith('.json')) {
        extractedText = fs.readFileSync(req.file.path, 'utf8');
      } else {
        extractedText = `Uploaded document: ${req.file.originalname} (${req.file.mimetype})`;
      }
    } catch (readErr) {
      extractedText = `Uploaded document: ${req.file.originalname}`;
    }

    const embedding = await generateEmbedding(extractedText);

    const doc = new UserDocument({
      userId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: fileSize,
      mimetype: req.file.mimetype,
      extractedText,
      embedding
    });

    await doc.save();

    res.status(201).json({
      message: 'Document uploaded and indexed successfully into vector memory.',
      document: {
        id: doc._id,
        originalName: doc.originalName,
        size: doc.size,
        createdAt: doc.createdAt
      },
      quotaUsed: currentTotalBytes + fileSize
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error processing file upload.' });
  }
});

// List user documents
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const docs = await UserDocument.find({ userId }).sort({ createdAt: -1 });
    const totalBytes = docs.reduce((sum, doc) => sum + doc.size, 0);

    res.json({
      documents: docs.map(d => ({
        id: d._id,
        originalName: d.originalName,
        size: d.size,
        createdAt: d.createdAt
      })),
      totalUsedBytes: totalBytes,
      maxBytes: 10 * 1024 * 1024
    });
  } catch (err) {
    console.error('List docs error:', err);
    res.status(500).json({ error: 'Server error listing documents.' });
  }
});

// Delete document (Free up memory)
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const docId = req.params.id;

    const doc = await UserDocument.findOne({ _id: docId, userId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    // Delete file from disk
    if (fs.existsSync(doc.path)) {
      fs.unlinkSync(doc.path);
    }

    await UserDocument.deleteOne({ _id: docId });

    const remainingDocs = await UserDocument.find({ userId });
    const totalBytes = remainingDocs.reduce((sum, d) => sum + d.size, 0);

    res.json({
      message: 'Document deleted successfully and memory freed.',
      totalUsedBytes: totalBytes,
      maxBytes: 10 * 1024 * 1024
    });
  } catch (err) {
    console.error('Delete doc error:', err);
    res.status(500).json({ error: 'Server error deleting document.' });
  }
});

module.exports = router;
