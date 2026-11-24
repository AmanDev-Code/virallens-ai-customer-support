const Chat = require('../models/Chat');

// Circuit Breaker State
let circuitState = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
let failureCount = 0;
let lastFailureTime = null;
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 30000; // 30 seconds

async function callAIAgentWithResilience(messages, attempt = 1) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Check Circuit Breaker
  if (circuitState === 'OPEN') {
    if (Date.now() - lastFailureTime > RESET_TIMEOUT_MS) {
      circuitState = 'HALF-OPEN';
      console.log('Circuit breaker entering HALF-OPEN state.');
    } else {
      console.warn('Circuit breaker is OPEN. Falling back to support assistant mode.');
      return getFallbackResponse(messages);
    }
  }

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return getFallbackResponse(messages);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://virallens.com',
        'X-Title': 'Virallens Support Agent'
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert, professional, and empathetic AI customer support agent for Virallens, an AI-Native Autonomous Growth & Support platform. Provide clear, concise, and helpful assistance.'
          },
          ...messages
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // Success - reset circuit breaker if half-open or recovering
      if (circuitState === 'HALF-OPEN' || circuitState === 'OPEN') {
        circuitState = 'CLOSED';
        failureCount = 0;
      }
      return data.choices[0].message.content;
    } else {
      throw new Error('Invalid response structure from AI provider');
    }
  } catch (error) {
    console.error(`AI call attempt ${attempt} failed:`, error.message);

    // Exponential Backoff Retry (Max 3 attempts)
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.log(`Retrying AI call in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIAgentWithResilience(messages, attempt + 1);
    }

    // Trip Circuit Breaker
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      circuitState = 'OPEN';
      lastFailureTime = Date.now();
      console.error('Circuit breaker tripped to OPEN due to repeated failures.');
    }

    return getFallbackResponse(messages);
  }
}

function getFallbackResponse(messages) {
  const lastMsg = messages[messages.length - 1].content.toLowerCase();
  if (lastMsg.includes('hello') || lastMsg.includes('hi')) {
    return "Hello! Welcome to Virallens Customer Support. How can I assist you with our platform today?";
  } else if (lastMsg.includes('pricing') || lastMsg.includes('cost')) {
    return "Virallens offers flexible pricing plans tailored for creators and growth teams starting at $29/month. Would you like a breakdown of our features?";
  } else if (lastMsg.includes('bug') || lastMsg.includes('error') || lastMsg.includes('issue')) {
    return "I'm sorry to hear you're experiencing an issue. Could you please share the error message or steps to reproduce so I can log this for our engineering team?";
  }
  return `Thank you for reaching out to Virallens Support! I've logged your query regarding "${messages[messages.length - 1].content}". Our team is on it, and I'm here to help answer any questions about our AI-native growth and support tools.`;
}

exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId, clientMessageId } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    let chat;
    if (conversationId) {
      // Find chat and verify ownership (user isolation)
      chat = await Chat.findOne({ _id: conversationId, userId });
    }

    if (!chat) {
      chat = new Chat({
        userId,
        title: message.length > 30 ? message.substring(0, 30) + '...' : message,
        messages: []
      });
    }

    // Idempotency check: prevent duplicate message insertion if clientMessageId matches last user message within 5s
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (lastMsg && lastMsg.sender === 'user' && lastMsg.content === message.trim() && (Date.now() - new Date(lastMsg.timestamp).getTime() < 5000)) {
      return res.json({
        conversationId: chat._id,
        title: chat.title,
        reply: chat.messages[chat.messages.length - 1].content,
        messages: chat.messages
      });
    }

    chat.messages.push({ sender: 'user', content: message.trim() });

    // Format messages for AI context (last 10 messages)
    const contextMessages = chat.messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const aiReplyText = await callAIAgentWithResilience(contextMessages);

    chat.messages.push({ sender: 'assistant', content: aiReplyText });
    chat.updatedAt = Date.now();
    if (chat.messages.length === 2) {
      chat.title = message.length > 30 ? message.substring(0, 30) + '...' : message;
    }

    // Save with concurrency versioning
    await chat.save();

    res.json({
      conversationId: chat._id,
      title: chat.title,
      reply: aiReplyText,
      messages: chat.messages
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error processing chat message.' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 }).limit(50);
    res.json({ conversations: chats });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error retrieving chat history.' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const chat = await Chat.findOne({ _id: id, userId });
    if (!chat) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json({ conversation: chat });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Server error retrieving conversation.' });
  }
};
