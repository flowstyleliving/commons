import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  sender: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, sender }) => {
  if (!isTyping) return null;

  return (
    <div className="flex items-center space-x-2 text-amber-700 text-sm my-3 ml-12">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs mr-2 ring-2 ring-white shadow-sm">
        AI
      </div>
      <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl px-3 py-2 border border-teal-200 shadow-sm backdrop-blur-sm">
        <div className="flex items-center space-x-1">
          <span className="text-teal-700 text-xs">thinking</span>
          <div className="flex space-x-1">
            <div role="presentation" className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div role="presentation" className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div role="presentation" className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator; 