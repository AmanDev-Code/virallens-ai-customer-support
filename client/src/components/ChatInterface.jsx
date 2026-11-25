import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { Bot, Send, User, LogOut, Plus, MessageSquare, Sparkles, ShieldCheck, Cpu, HardDrive, Paperclip, X, FileText } from 'lucide-react';
import MemoryModal from './MemoryModal';

export default function ChatInterface({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([
    { sender: 'assistant', content: `Hello ${user.name}! I am your Virallens Autonomous Growth & Support AI. How can I assist you with our platform today?` }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typingStage, setTypingStage] = useState('Analysing query...');
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const fileInputRef = useRef(null);
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
      { sender: 'assistant', content: `Hello ${user.name}! Starting a fresh autonomous support session. What can I help you optimize?` }
    ]);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedFile) || loading) return;

    let userText = inputMessage.trim();
    setInputMessage('');
    const fileToUpload = attachedFile;
    setAttachedFile(null);

    let displayMessage = userText;
    if (fileToUpload) {
      displayMessage = userText ? `${userText}\n[Attached: ${fileToUpload.name}]` : `[Attached: ${fileToUpload.name}]`;
    }

    setMessages(prev => [...prev, { sender: 'user', content: displayMessage }]);
    setLoading(true);

    setTypingStage('Uploading file & indexing into vector memory...');
    const stageTimer1 = setTimeout(() => setTypingStage('Searching knowledge base & user memory...'), 900);
    const stageTimer2 = setTimeout(() => setTypingStage('Synthesizing neural response...'), 1800);

    try {
      let activeConversationId = currentConversationId;

      if (fileToUpload) {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        const token = localStorage.getItem('virallens_token');

        const uploadRes = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'File upload failed');
      }

      const res = await apiRequest('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          message: userText || `Please analyze the attached document: ${fileToUpload?.name}`,
          conversationId: activeConversationId
        })
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      setCurrentConversationId(res.conversationId);
      setMessages(res.messages);
      fetchHistory();
    } catch (err) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      console.error('Failed to send message/file:', err);
      setMessages(prev => [...prev, { sender: 'assistant', content: `Sorry, I encountered an error: ${err.message || 'Please try again.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-[#0b0e17] border-r border-slate-800/80 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm tracking-wide">Virallens AI</h2>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-medium">Autonomous OS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Session</span>
          </button>

          <button
            onClick={() => setIsMemoryModalOpen(true)}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition-all border border-slate-700/60 cursor-pointer"
          >
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Memory & Documents (10MB)</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Active Conversations</div>
          {conversations.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">No conversation logs yet.</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm flex items-center space-x-3 transition-all cursor-pointer ${
                  currentConversationId === conv._id
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-slate-400" />
                <span className="truncate">{conv.title || 'Support Chat'}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800/80 bg-[#090b13] flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-xs font-bold shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-[#07090e] min-w-0">
        <div className="h-16 border-b border-slate-800/80 flex items-center justify-between px-6 bg-[#0b0e17]/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-100 text-sm">Virallens Support & Growth Agent</h1>
              <p className="text-[11px] text-slate-400">Hybrid Vector RAG + Nemotron-3.5 Intelligence</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Encrypted & Rate-Limited</span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 sm:space-x-4 max-w-3xl w-full ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-teal-600/20'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div
                className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-md max-w-[calc(100%-4rem)] sm:max-w-2xl break-words ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-600/20'
                    : 'bg-[#111625] border border-slate-800 text-slate-100 rounded-tl-none shadow-xl'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-4 max-w-3xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-[#111625] border border-slate-800 px-5 py-4 rounded-2xl rounded-tl-none text-slate-300 text-sm shadow-xl flex items-center space-x-3">
                <div className="flex space-x-1.5 items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-xs font-medium text-emerald-300 tracking-wide">{typingStage}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Attachment */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0b0e17]/80 backdrop-blur-md flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {attachedFile && (
              <div className="flex items-center justify-between bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs text-emerald-200">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate font-medium">{attachedFile.name}</span>
                  <span className="text-slate-400">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 hover:bg-emerald-900/60 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".md,.txt,.pdf,.json,image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach document or image (MD, TXT, PDF, JSON, Images)"
                className="absolute left-3.5 p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything or attach a document (MD, TXT, PDF, JSON, Image)..."
                className="w-full bg-[#111625] border border-slate-700/80 rounded-2xl pl-13 pr-14 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm shadow-inner transition-all"
              />
              <button
                type="submit"
                disabled={loading || (!inputMessage.trim() && !attachedFile)}
                className="absolute right-2.5 p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <MemoryModal isOpen={isMemoryModalOpen} onClose={() => setIsMemoryModalOpen(false)} />
    </div>
  );
}
