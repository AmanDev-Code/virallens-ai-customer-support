const Chat = require('../models/Chat');

async function callAIAgent(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    // Fallback smart support agent response when API key is not yet configured
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

  try {
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
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error('OpenRouter response error:', data);
      return "I'm having a little trouble connecting to my knowledge base right now. How else can I assist you today?";
    }
  } catch (error) {
    console.error('AI call exception:', error);
    return "Hello! Thanks for your message. Our support AI is currently operating in offline assistant mode. How can I help you?";
  }
}

exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
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

    chat.messages.push({ sender: 'user', content: message });

    // Format messages for AI context (last 10 messages)
    const contextMessages = chat.messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const aiReplyText = await callAIAgent(contextMessages);

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
