'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiMenu, FiX, FiHome, FiLogIn, FiInfo, FiDollarSign, FiHeart, FiMessageCircle, FiSend, FiRefreshCw } from 'react-icons/fi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function MenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm here to help you learn about TenantWise. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('menu-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden';
      inputRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
  }, [isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = () => {
    setIsOpen(false);
    setTimeout(() => setIsChatOpen(true), 100);
  };

  const resetChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "Hi! I'm here to help you learn about TenantWise. What would you like to know?",
      },
    ]);
    setInput('');
  };

  const handleQuickQuestion = async (question: string) => {
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble right now. Please try again in a moment!",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble right now. Please try again in a moment!",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Menu Button - slides with menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 z-[60] p-3 bg-white rounded-lg shadow-lg border border-border hover:bg-gray-50 transition-all duration-300 ease-out ${
          isOpen ? 'left-[272px]' : 'left-4'
        }`}
        aria-label="Menu"
      >
        {isOpen ? (
          <FiX className="w-5 h-5 text-gray-700" />
        ) : (
          <FiMenu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-6 px-4">
          {/* Logo Header */}
          <div className="pb-4 border-b border-border">
            <Link
              href="/"
              className="flex items-center justify-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              <Image src="/favicon.svg" alt="Tenant Wise" width={36} height={36} />
              <span
                className="font-bold text-3xl"
                style={{
                  background: 'linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Tenant Wise
              </span>
            </Link>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 py-4">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              <FiHome className="w-5 h-5" />
              Home
            </Link>

            <Link
              href="/about"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              <FiInfo className="w-5 h-5" />
              About
            </Link>

            <Link
              href="/#pricing"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              <FiDollarSign className="w-5 h-5" />
              Plans
            </Link>

            <div className="my-2 border-t border-border" />

            <Link
              href="/login"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              <FiLogIn className="w-5 h-5" />
              Login
            </Link>
          </nav>

          {/* Chat Button */}
          <div className="px-4 pb-3">
            <button
              onClick={openChat}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <FiMessageCircle className="w-5 h-5" />
              Chat with our Agent
            </button>
          </div>

          {/* Footer Content */}
          <div className="py-3 border-t border-border">
            <div className="flex flex-col gap-1 px-4 text-sm">
              <Link
                href="/privacy"
                className="text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Terms of Service
              </Link>
            </div>
            <p className="px-4 mt-3 text-xs text-gray-400">
              © {new Date().getFullYear()} Tenant Wise
            </p>
            <p className="px-4 mt-1 text-xs text-gray-400">
              Documents are templates only. Consult an attorney for legal advice.
            </p>
          </div>

          {/* Made in Texas */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-2 text-sm text-gray-600">
            <span>Made in Texas with</span>
            <FiHeart className="w-4 h-4 text-red-500 fill-red-500" />
          </div>
        </div>
      </div>

      {/* Menu Overlay - click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsChatOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">TenantWise Assistant</h3>
                <p className="text-sm text-blue-100">Ask me about the app!</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={resetChat}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Reset conversation"
                >
                  <FiRefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {['What is TenantWise?', 'How much does it cost?', 'What documents can I create?'].map(
                  (q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full text-slate-600 transition-colors"
                    >
                      {q}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-slate-200">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      {children}
    </div>
  );
}
