'use client';

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiTrash2, FiAlertCircle, FiLock } from 'react-icons/fi';
import { FaBalanceScale } from 'react-icons/fa';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ConfirmModal } from '@/components/ui/Modal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history on mount
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat?limit=50');
      if (response.ok) {
        const data = await response.json();
        if (data.history && data.history.length > 0) {
          setMessages(
            data.history.map((msg: { id: string; role: string; content: string; created_at: string }) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }))
          );
        }
      } else if (response.status === 403) {
        setNeedsUpgrade(true);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/chat', { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgrade) {
          setNeedsUpgrade(true);
        }
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const sendExamplePrompt = async (prompt: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgrade) {
          setNeedsUpgrade(true);
        }
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Upgrade prompt for free users
  if (needsUpgrade) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiLock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Upgrade to Access Legal Assistant</h1>
          <p className="text-muted-foreground mb-6">
            Our AI-powered legal assistant helps you understand Texas landlord-tenant law,
            find relevant Property Code sections, and get guidance on common situations.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Available for Basic ($19/mo) and Pro ($39/mo) subscribers.
          </p>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 -mx-8 -mt-8 px-8 pt-8 pb-12 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Legal Assistant</h1>
            <p className="text-purple-100">Ask questions about Texas landlord-tenant law</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium shadow-lg"
            >
              <FiTrash2 className="w-4 h-4" />
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-border p-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <FaBalanceScale className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-medium mb-2">How can I help you today?</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Ask me about Texas Property Code, landlord rights and responsibilities,
              eviction procedures, security deposits, or any other landlord-tenant questions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
              {[
                'How long do I have to return a security deposit in Texas?',
                'What are the requirements for a 3-day eviction notice?',
                'Can I charge a late fee for rent in Texas?',
                'What repairs am I required to make as a landlord?',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendExamplePrompt(suggestion)}
                  disabled={isLoading}
                  className="text-left p-3 text-sm bg-muted hover:bg-muted/70 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-sm prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-foreground">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  )}
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
          <FiAlertCircle />
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about Texas landlord-tenant law..."
          rows={2}
          className="w-full px-4 py-3 pr-14 rounded-xl border border-border bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-3 bottom-3 p-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FiSend className="w-5 h-5" />
        </button>
      </form>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center mt-3">
        This is an AI assistant for educational purposes only. It is not a substitute for legal advice.
        Always consult with a licensed attorney for specific legal matters.
      </p>

      {/* Clear History Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={clearHistory}
        title="Clear Chat History"
        message="Are you sure you want to clear your chat history? This action cannot be undone."
        confirmText="Clear History"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
