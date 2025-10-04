'use client';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const messageClass = role === 'user' ? 'user-message' : role === 'assistant' ? 'assistant-message' : 'system-message';

  return (
    <div className={`message ${messageClass}`}>
      {content}
    </div>
  );
}
