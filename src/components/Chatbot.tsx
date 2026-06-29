import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

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
    { role: 'assistant', content: "Hi, I'm PortIQ Assist — your AI investment companion. Ask me anything about stocks, portfolios, or how to use the platform." },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const response = await fetch('YOUR_N8N_WEBHOOK_URL_4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Sorry, I encountered an issue. Please try again.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an issue. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── FAB ── */
  if (!isOpen) {
    return (
      <button onClick={onOpen} aria-label="Open chat"
        className="fixed z-[9999] flex items-center justify-center w-14 h-14 rounded-full animate-float transition-transform duration-300 hover:scale-110"
        style={{
          bottom: '28px', right: '28px',
          background: 'linear-gradient(135deg, #C9A84C, #E8C96B)',
          boxShadow: '0 0 0 1px rgba(201,168,76,0.3), 0 8px 32px rgba(201,168,76,0.35)',
        }}>
        <MessageCircle className="w-6 h-6 text-[#03050C]" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#03050C] bg-emerald-400 animate-pulse" />
      </button>
    );
  }

  /* ── Chat Window ── */
  return (
    <div className="fixed z-[9999] animate-fade-in-up flex flex-col"
      style={{
        bottom: '28px', right: '28px',
        width: '380px', height: '560px',
        maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 56px)',
        background: 'rgba(8,10,20,0.85)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '20px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(201,168,76,0.08)',
      }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <Bot className="w-[18px] h-[18px] text-[#C9A84C]" />
          </div>
          <div>
            <p className="text-[#F0EEE8] font-semibold text-sm leading-none mb-1">PortIQ Assist</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#4A4E65] text-xs">AI-powered support</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close chat"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A4E65] hover:text-[#F0EEE8] transition-colors duration-200"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.2) transparent' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
              style={msg.role === 'user' ? {
                background: 'linear-gradient(135deg, #C9A84C, #E8C96B)',
                color: '#03050C',
                fontWeight: 500,
                borderBottomRightRadius: '4px',
              } : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#C8C5BB',
                borderBottomLeftRadius: '4px',
              }}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-[4px] flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[0, 150, 300].map(delay => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-bounce"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about investing…"
            disabled={isLoading}
            className="premium-input flex-1 text-sm py-2.5"
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96B)', boxShadow: !input.trim() ? 'none' : '0 4px 16px rgba(201,168,76,0.3)' }}>
            <Send className="w-4 h-4 text-[#03050C]" />
          </button>
        </div>
      </div>
    </div>
  );
}
