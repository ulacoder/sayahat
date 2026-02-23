import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AIAssistant = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage = { role: 'user', content: input, image: selectedImage };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/ai-assistant/chat`,
        {
          message: input,
          image_base64: selectedImage,
          language: i18n.language
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, aiMessage]);
      setSelectedImage(null);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Unable to get response' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        setSelectedImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) {
    return (
      <button
        data-testid="ai-assistant-open-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full shadow-2xl hover:shadow-emerald-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-[9999] animate-pulse"
        style={{ pointerEvents: 'auto' }}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div data-testid="ai-assistant-chat" className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden border border-emerald-100">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">{t('aiAssistant')}</h3>
            <p className="text-xs text-emerald-100">EcoSayahat AI</p>
          </div>
        </div>
        <button
          data-testid="ai-assistant-close-btn"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-emerald-50/30 to-white">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <p className="text-sm">{t('askQuestion')}</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-white border border-emerald-100 text-slate-800'}`}>
              {msg.image && (
                <img src={`data:image/jpeg;base64,${msg.image}`} alt="User upload" className="rounded-lg mb-2 max-w-full" />
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-emerald-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-emerald-100 bg-white">
        {selectedImage && (
          <div className="mb-2 relative inline-block">
            <img src={`data:image/jpeg;base64,${selectedImage}`} alt="Preview" className="h-16 rounded-lg" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <label className="cursor-pointer flex items-center justify-center w-10 h-10 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors">
            <ImageIcon size={20} className="text-emerald-600" />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <input
            data-testid="ai-assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t('askQuestion')}
            className="flex-1 px-4 py-2 border border-emerald-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50"
          />
          <button
            data-testid="ai-assistant-send-btn"
            onClick={handleSendMessage}
            disabled={loading || (!input.trim() && !selectedImage)}
            className="w-10 h-10 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};