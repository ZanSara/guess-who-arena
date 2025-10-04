'use client';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system' | 'tool-call';
  content: string;
  toolName?: string;
}

export default function ChatMessage({ role, content, toolName }: ChatMessageProps) {
  if (role === 'tool-call') {
    return (
      <div className="my-2 px-3 py-2 bg-amber-50 border-l-4 border-amber-400 rounded-r text-sm">
        <span className="text-amber-800 mb-1 mr-2">
          🔧 Tool Call:
        </span>
        <span className="text-amber-700 font-mono text-xs">
          {toolName}({content})
        </span>
      </div>
    );
  }

  const messageClass = role === 'user' ? 'user-message' : role === 'assistant' ? 'assistant-message' : 'system-message';

  return (
    <div className={`message ${messageClass}`}>
      {content}
    </div>
  );
}
