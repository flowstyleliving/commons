import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  sender: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, sender }) => {
  if (!isTyping) return null;

  return (
    <div className="flex items-center space-x-2 text-gray-500 text-sm">
      <span>{sender} is typing</span>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default TypingIndicator; 