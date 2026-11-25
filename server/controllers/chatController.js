const Chat = require('../models/Chat');
const UserDocument = require('../models/UserDocument');
const { hybridSearch, generateEmbedding, seedKnowledgeBase } = require('../services/ragService');

// Ensure knowledge base is seeded
seedKnowledgeBase().catch(err => console.error('Failed to seed KB:', err));

// Circuit Breaker State & Guardrails
let circuitState = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
let failureCount = 0;
let lastFailureTime = null;
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

async function searchUserDocuments(userId, query) {
  try {
    const userDocs = await UserDocument.find({ userId, embedding: { $exists: true, $ne: [] } });
    if (userDocs.length === 0) return '';

    const queryEmbedding = await generateEmbedding(query);
    const scored = userDocs.map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    })).sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score > 0.3) {
      return `[User Uploaded Memory: ${scored[0].doc.originalName}]\n${scored[0].doc.extractedText}`;
    }
  } catch (err) {
    console.error('User doc vector search error:', err.message);
  }
  return '';
}

async function callAIAgentWithResilience(messages, ragContext = '', attempt = 1) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (circuitState === 'OPEN') {
    if (Date.now() - lastFailureTime > RESET_TIMEOUT_MS) {
      circuitState = 'HALF-OPEN';
    } else {
      return getFallbackResponse(messages, ragContext);
    }
  }

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return getFallbackResponse(messages, ragContext);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const systemPrompt = `You are an elite, professional, and empathetic AI customer support lead for Virallens, an AI-Native Autonomous Growth & Support operating system.
Use the following Verified Knowledge Base Context and User Memory to answer the user's question accurately.

--- Verified Knowledge Base & User Memory Context ---
${ragContext || 'No specific knowledge base article matched.'}
------------------------------------------------------`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://virallens.com',
        'X-Title': 'Virallens Support Agent'
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'nvidia/nemotron-3.5-super-vl:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.3,
        max_tokens: 1024
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
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

    if (attempt <= MAX_RETRIES) {
      const delay = Math.min(Math.pow(2, attempt) * 1000, 4000) + Math.random() * 300;
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIAgentWithResilience(messages, ragContext, attempt + 1);
    }

    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      circuitState = 'OPEN';
      lastFailureTime = Date.now();
    }

    return getFallbackResponse(messages, ragContext);
  }
}

function getFallbackResponse(messages, ragContext) {
  const lastMsg = messages[messages.length - 1].content.toLowerCase();

  if (ragContext) {
    return `Based on Virallens documentation and your uploaded memory:\n\n${ragContext.substring(0, 500)}\n\nHow else can I assist you with your growth workflows today?`;
  }

  if (lastMsg.includes('hello') || lastMsg.includes('hi')) {
    return "Hello! Welcome to Virallens Support. I am your autonomous AI growth and support assistant. How can I help optimize your workflows today?";
  } else if (lastMsg.includes('pricing') || lastMsg.includes('cost')) {
    return "Virallens offers flexible pricing tailored for creators and growth teams: Starter ($29/mo), Growth ($79/mo), and Enterprise (custom).";
  }
  return `Thank you for contacting Virallens Support. I've recorded your inquiry regarding "${messages[messages.length - 1].content}".`;
}

exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // 1. Hybrid RAG Search (Global KB + User Uploaded Memory)
    let ragContext = '';
    try {
      const [globalResults, userDocContext] = await Promise.all([
        hybridSearch(message, 3),
        searchUserDocuments(userId, message)
      ]);

      let parts = [];
      if (userDocContext) parts.push(userDocContext);
      if (globalResults && globalResults.length > 0) {
        parts.push(globalResults.map(r => `[Topic: ${r.doc.title}]\n${r.doc.content}`).join('\n\n'));
      }
      ragContext = parts.join('\n\n');
    } catch (ragErr) {
      console.error('Hybrid RAG search error:', ragErr.message);
    }

    let chat;
    if (conversationId) {
      chat = await Chat.findOne({ _id: conversationId, userId });
    }

    if (!chat) {
      chat = new Chat({
        userId,
        title: message.length > 30 ? message.substring(0, 30) + '...' : message,
        messages: []
      });
    }

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

    const contextMessages = chat.messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const aiReplyText = await callAIAgentWithResilience(contextMessages, ragContext);

    chat.messages.push({ sender: 'assistant', content: aiReplyText });
    chat.updatedAt = Date.now();
    if (chat.messages.length === 2) {
      chat.title = message.length > 30 ? message.substring(0, 30) + '...' : message;
    }

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
