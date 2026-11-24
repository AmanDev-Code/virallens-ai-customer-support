import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { Bot, Send, User, LogOut, Plus, MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';

export default function ChatInterface({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([
    { sender: 'assistant', content: `Hello ${user.name}! I'm your Virallens AI Customer Support Assistant. How can I help you today?` }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const data = await apiRequest('/chat/history');
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  };

  const handleSelectConversation = async (conv) => {
    setCurrentConversationId(conv._id);
    setMessages(conv.messages || []);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([
      { sender: 'assistant', content: `Hello ${user.name}! Starting a fresh support conversation. What can I assist you with?` }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { sender: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await apiRequest('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          message: userText,
          conversationId: currentConversationId
        })
      });

      setCurrentConversationId(res.conversationId);
      setMessages(res.messages);
      fetchHistory();
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { sender: 'assistant', content: 'Sorry, I encountered an error processing your request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Virallens Support</h2>
              <div className="flex items-center space-x-1 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-brand-600/20 flex items-center justify-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">History</div>
          {conversations.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-8">No past conversations yet.</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center space-x-3 transition-colors ${
                  currentConversationId === conv._id
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{conv.title || 'Support Chat'}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-950">
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-white text-sm">AI Customer Support Assistant</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400 bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure & Encrypted Session</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-4 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                    : 'bg-gradient-to-tr from-brand-600 to-indigo-400 text-white'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-4 max-w-3xl">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl rounded-tl-none text-gray-400 text-sm flex items-center space-x-2">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs ml-2 text-gray-400">Support agent is typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about Virallens or support..."
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-4 pr-14 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="absolute right-2 p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
