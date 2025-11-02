import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function Chatbot({ isOpen, onClose, onOpen }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m PortIQ Assist. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('YOUR_N8N_WEBHOOK_URL_4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'I apologize, but I encountered an error. Please try again.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="group fixed w-16 h-16 bg-white text-black rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.3)] hover:bg-gray-200 transition-all duration-300 hover:scale-110 flex items-center justify-center z-[9999] relative overflow-hidden animate-float"
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          left: 'auto'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-100 to-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <MessageCircle className="w-7 h-7 relative z-10 transition-transform duration-300 group-hover:rotate-12" />
        <div className="absolute inset-0 border-2 border-white/30 rounded-full scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
        <Sparkles className="absolute -top-2 -left-2 w-6 h-6 text-yellow-400 animate-pulse opacity-70" />
      </button>
    );
  }

  return (
    <div 
      className="fixed w-96 h-[600px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col z-[9999] animate-fade-in-up backdrop-blur-sm md:w-96 sm:w-[calc(100vw-48px)]"
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        left: 'auto',
        maxHeight: 'calc(100vh - 48px)',
        maxWidth: 'calc(100vw - 48px)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl opacity-90"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 rounded-2xl opacity-50 animate-pulse"></div>
      <div className="relative z-10 bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-t-2xl border-b border-gray-700 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
            <MessageCircle className="w-5 h-5 text-black relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-gray-800"></div>
          </div>
          <div>
            <h3 className="font-semibold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              PortIQ Assist
            </h3>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              AI-powered support
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-90 relative group"
        >
          <X className="w-5 h-5 relative z-10" />
          <div className="absolute inset-0 bg-white/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300"></div>
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 relative overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                message.role === 'user'
                  ? 'bg-white text-black shadow-lg group'
                  : 'bg-gray-800 text-white border border-gray-700 group'
              }`}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {message.role === 'assistant' && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
              {message.role === 'user' && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap relative z-10">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-white border border-gray-700 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative z-10 p-4 border-t border-gray-700 backdrop-blur-sm">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white border border-gray-700 transition-all duration-300 hover:border-gray-600 focus:border-white"
              disabled={isLoading}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-transparent rounded-lg opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="group relative bg-white text-black rounded-lg px-4 py-2 hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-110 hover:shadow-lg overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            <Send className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
