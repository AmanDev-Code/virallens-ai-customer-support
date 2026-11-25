const mongoose = require('mongoose');

const userDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true }, // in bytes
  mimetype: { type: String, required: true },
  extractedText: { type: String, default: '' },
  embedding: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserDocument', userDocumentSchema);
