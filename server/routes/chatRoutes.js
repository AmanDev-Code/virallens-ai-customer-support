const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');

router.post('/send', auth, chatLimiter, chatController.sendMessage);
router.get('/history', auth, chatController.getHistory);
router.get('/:id', auth, chatController.getConversation);

module.exports = router;
