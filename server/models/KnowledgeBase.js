const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, default: 'general' },
  keywords: [String],
  // Embedding vector (e.g., 384 dimensions for lightweight free models or 1536 for OpenAI)
  embedding: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Full-text index for keyword search
knowledgeBaseSchema.index({ title: 'text', content: 'text', keywords: 'text' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
