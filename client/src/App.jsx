import React, { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import ChatInterface from './components/ChatInterface';
import { apiRequest } from './utils/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const token = localStorage.getItem('virallens_token');
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    try {
      const res = await apiRequest('/auth/me');
      setUser(res.user);
    } catch (err) {
      console.warn('Auth check failed, logging out');
      localStorage.removeItem('virallens_token');
      localStorage.removeItem('virallens_user');
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('virallens_token');
    localStorage.removeItem('virallens_user');
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-brand-500 animate-ping"></div>
          <span className="text-sm font-medium text-gray-400">Loading Virallens Support...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return <ChatInterface user={user} onLogout={handleLogout} />;
}
