'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isProcessing,
  disabled = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div
        className="flex-1 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 flex flex-col"
        ref={messagesContainerRef}
      >
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        {isProcessing && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'Game not started...' : 'Type your message...'}
          disabled={disabled || isProcessing}
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-full outline-none focus:border-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || isProcessing || !input.trim()}
          className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full font-semibold shadow-md hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}
