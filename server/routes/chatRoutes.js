const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per IP/user
  message: { error: 'Rate limit exceeded. Please slow down your messages.' }
});

router.post('/send', auth, chatLimiter, chatController.sendMessage);
router.get('/history', auth, chatController.getHistory);
router.get('/:id', auth, chatController.getConversation);

module.exports = router;
